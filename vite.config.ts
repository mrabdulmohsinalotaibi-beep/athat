import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public browser connection identifiers. These are safe to bundle in the client;
// row-level security remains enforced by Supabase. Hosting environments can still
// override them with VITE_SUPABASE_* variables when configured.
const publicBackend = {
  url: "https://fxgjhynweykuuizrnzah.supabase.co",
  projectId: "fxgjhynweykuuizrnzah",
  publishableKey: "sb_publishable_hZ_1x1Tym3D7-HeMB3DzhQ_wOfJOTU9",
};

export default defineConfig({
  vite: {
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
});
