import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type RequestOptions = {
  context?: Record<string, unknown>;
};

type ServerEntry = {
  fetch: (request: Request, opts?: RequestOptions) => Promise<Response> | Response;
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
  async fetch(request: Request, opts?: RequestOptions) {
    const canonical = canonicalRedirect(request);
    if (canonical) return canonical;

    // Nitro v3 attaches Cloudflare bindings to the incoming request runtime.
    // Forward them through TanStack's official per-request context so server
    // functions can access secrets without exposing them to the browser.
    const runtimeEnv = (
      request as Request & {
        runtime?: {
          cloudflare?: {
            env?: Record<string, unknown>;
          };
        };
      }
    ).runtime?.cloudflare?.env;

    const stringEnv: Record<string, string> = {};
    if (runtimeEnv) {
      for (const [key, value] of Object.entries(runtimeEnv)) {
        if (typeof value === "string") stringEnv[key] = value;
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, {
        ...opts,
        context: {
          ...(opts?.context ?? {}),
          cloudflareEnv: stringEnv,
        },
      });
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
