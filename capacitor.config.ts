import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.athat.mobile",
  appName: "الذات",
  webDir: "native-shell",
  server: {
    url: "https://athat.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#3C3C3C",
  },
};

export default config;
