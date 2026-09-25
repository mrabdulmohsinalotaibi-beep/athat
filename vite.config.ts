import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// These are public browser connection identifiers, not privileged credentials.
// Keeping fallbacks here lets Git-based hosts build the app even when their
// environment-variable panel has not been configured yet.
const publicBackend = {
  url: "https://fxgjhynweykuuizrnzah.supabase.co",
  projectId: "fxgjhynweykuuizrnzah",
  publishableKey: "sb_publishable_hZ_1x1Tym3D7-HeMB3DzhQ_wOfJOTU9",
};

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: ["5173-ivf1p6isf8wtpgcca1e3y-4463b23e.sg2.manus.computer"],
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
