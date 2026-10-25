import type { CapacitorConfig } from "@capacitor/cli";

// Loads the bundled web build from inside the APK. No server.url: nothing is fetched remotely at start-up.
const config: CapacitorConfig = {
  appId: "com.vanshika.diary",
  appName: "Vanshika's Diary",
  webDir: "android-web",
  android: { allowMixedContent: false, adjustMarginsForEdgeToEdge: "disable" },
  plugins: { StatusBar: { overlaysWebView: true, style: "LIGHT" } },
  server: { androidScheme: "https" },
};

export default config;
