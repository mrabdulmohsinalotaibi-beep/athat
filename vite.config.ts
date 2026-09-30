import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Prefer the backend injected by Lovable Cloud / the deployment environment.
// The legacy values are only a final build fallback so external Git hosts can
// still compile when their environment panel has not been configured yet.
const legacyBackend = {
  url: "https://fxgjhynweykuuizrnzah.supabase.co",
  projectId: "fxgjhynweykuuizrnzah",
  publishableKey: "sb_publishable_hZ_1x1Tym3D7-HeMB3DzhQ_wOfJOTU9",
};

const env = process.env;
const publicBackend = {
  url:
    env["VITE_SUPABASE_URL"] ||
    env["SUPABASE_URL"] ||
    legacyBackend.url,
  projectId:
    env["VITE_SUPABASE_PROJECT_ID"] ||
    env["SUPABASE_PROJECT_ID"] ||
    legacyBackend.projectId,
  publishableKey:
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    env["SUPABASE_PUBLISHABLE_KEY"] ||
    legacyBackend.publishableKey,
};

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      // The preview hostname changes per sandbox/session; the app is still bound
      // to 0.0.0.0, so allow the active preview host instead of a stale hostname.
      allowedHosts: true,
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicBackend.url),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(publicBackend.projectId),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicBackend.publishableKey),
      "process.env.SUPABASE_URL": JSON.stringify(publicBackend.url),
      "process.env.SUPABASE_PROJECT_ID": JSON.stringify(publicBackend.projectId),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicBackend.publishableKey),
    },
  },
  tanstackStart: {
    srcDirectory: "src",
    server: { entry: "server" },
  },
  // External Cloudflare Pages builds can still select their own preset through
  // NITRO_PRESET. Lovable builds pin the deployable module layout automatically.
  nitro: true,
});
