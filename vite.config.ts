// @lovable.dev/vite-tanstack-config provides Lovable Cloud's VITE_* backend
// injection. Do not override those values here: doing so can point the browser
// at a different Supabase project than the project's own Lovable Cloud database.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    srcDirectory: "src",
    server: { entry: "server" },
  },
});
