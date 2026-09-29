import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.athat.mobile",
  appName: "الذات",
  webDir: "native-shell",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#3C3C3C",
  },
};

export default config;
