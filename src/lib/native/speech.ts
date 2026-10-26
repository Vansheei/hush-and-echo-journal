import { isNativeAndroid } from "./platform";

// The plugin touches `window` at import time, so load it only on Android (never during server rendering).
const tts = async () => (await import("@capacitor-community/text-to-speech")).TextToSpeech;

export const COMPANION_RATE = 1.15;
export type LocalVoice = { voiceURI: string; name: string; lang: string; nativeIndex?: number };
export const ANDROID_DEFAULT: LocalVoice = { voiceURI: "android-default", name: "Android default voice", lang: "", nativeIndex: -1 };
export async function localVoices(): Promise<LocalVoice[]> {
  if (isNativeAndroid()) {
    // Android speaks through its own engine whether or not it enumerates voices, so the
    // default entry is always offered and a failed or empty listing never blocks speech.
    const fallback = [{ ...ANDROID_DEFAULT, lang: navigator.language || "en-US" }];
    try {
      const { voices } = await (await tts()).getSupportedVoices();
      const all = voices.map((v, nativeIndex) => ({ ...v, nativeIndex }));
      // Many Android voices report localService=false even when installed offline.
      const local = all.filter(v => v.localService);
      return [...fallback, ...(local.length ? local : all)];
    } catch { return fallback; }
  }
  return window.speechSynthesis?.getVoices().filter(v => v.localService) ?? [];
}
let cancelPending: (() => void) | undefined;
export async function stopSpeech() {
  cancelPending?.(); cancelPending = undefined;
  if (isNativeAndroid()) await (await tts()).stop();
  else window.speechSynthesis?.cancel();
}
export async function speakLocal(text: string, selected: LocalVoice | undefined, rate = COMPANION_RATE) {
  await stopSpeech();
  const TextToSpeech = isNativeAndroid() ? await tts() : undefined;
  // Native stop clears plugin callbacks without settling speak; settle our own wait on cancellation.
  return new Promise<void>((resolve, reject) => {
    const done = () => { if (cancelPending === done) cancelPending = undefined; resolve(); };
    cancelPending = done;
    if (TextToSpeech) {
      // With no chosen voice, Android uses its own default engine rather than refusing to speak.
      const index = selected?.nativeIndex;
      TextToSpeech.speak({ text, lang: selected?.lang || navigator.language || "en-US", ...(index !== undefined && index >= 0 ? { voice: index } : {}), rate, queueStrategy: 0 })
        .then(done, error => { done(); reject(error); });
    } else {
      if (!selected) { done(); reject(new Error("No on-device voice is installed. Text replies remain available.")); return; }
      const voice = window.speechSynthesis?.getVoices().find(v => v.voiceURI === selected.voiceURI && v.localService);
      if (!voice) { done(); reject(new Error("No on-device voice is installed. Text replies remain available.")); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = rate;
      utterance.onend = done;
      utterance.onerror = () => { done(); reject(new Error("Voice playback failed. Text replies remain available.")); };
      window.speechSynthesis.speak(utterance);
    }
  });
}