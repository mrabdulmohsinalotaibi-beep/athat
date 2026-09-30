import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.athat.android",
  appName: "الذات",
  webDir: "native-shell",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#073B4C",
  },
};

export default config;
