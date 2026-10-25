// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// CAPACITOR=1 builds a static single-page bundle that the Android app loads from inside the APK.
const capacitor = process.env["CAPACITOR"] === "1";

// The text-to-speech plugin reads `window` at import time and the server bundle merges it into the
// shared Capacitor chunk, crashing server rendering. Outside the browser bundle, replace it with a stub.
const TTS = "@capacitor-community/text-to-speech";
const ttsServerStub = {
  name: "tts-server-stub",
  enforce: "pre" as const,
  resolveId(this: { environment?: { name: string } }, id: string) {
    if (id === TTS && this.environment && this.environment.name !== "client") return "\0tts-server-stub";
  },
  load(id: string) {
    if (id === "\0tts-server-stub") return "export const TextToSpeech = {}; export const QueueStrategy = { Flush: 0, Add: 1 };";
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(capacitor ? { spa: { enabled: true } } : {}),
  },
  vite: { plugins: [ttsServerStub] },
});
