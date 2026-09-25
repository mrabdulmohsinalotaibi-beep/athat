import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
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
