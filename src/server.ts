import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  // Keep local/preview domains untouched. Only normalize known ATHAT production hosts.
  if (host === "www.athat.app") {
    url.protocol = "https:";
    url.hostname = "athat.app";
    url.port = "";
    return Response.redirect(url.toString(), 308);
  }

  if (host === "athat.app" && url.protocol !== "https:") {
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 308);
  }

  if (host === "athat.app" && (url.pathname === "/index.html" || url.pathname === "/home")) {
    url.pathname = "/";
    return Response.redirect(url.toString(), 308);
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const canonical = canonicalRedirect(request);
    if (canonical) return canonical;
    // Cloudflare Workers exposes secrets/bindings through the fetch env object.
    // TanStack Start server functions in this project read server settings from
    // process.env, so bridge the relevant non-public bindings for each request.
    if (env && typeof env === "object") {
      const bindings = env as Record<string, unknown>;
      const processEnv = (globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }).process?.env;
      if (processEnv) {
        for (const key of [
          "DEEPSEEK_API_KEY",
          "DEEPSEEK_MODEL",
          "SUPABASE_URL",
          "SUPABASE_PUBLISHABLE_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
          "LOVABLE_CRON_SECRET",
          "LOVABLE_CRON_SECRET_PREVIOUS",
        ]) {
          const value = bindings[key];
          if (typeof value === "string" && value) processEnv[key] = value;
        }
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
