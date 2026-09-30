import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
  },
  tanstackStart: {
    srcDirectory: "src",
    server: { entry: "server" },
  },
  nitro: true,
});
