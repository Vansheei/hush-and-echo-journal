import { isNativeAndroid } from "./platform";

// The plugin touches `window` at import time, so load it only on Android (never during server rendering).
const tts = async () => (await import("@capacitor-community/text-to-speech")).TextToSpeech;

export const COMPANION_RATE = 1.15;
export type LocalVoice = { voiceURI: string; name: string; lang: string; nativeIndex?: number };
export async function localVoices(): Promise<LocalVoice[]> {
  if (isNativeAndroid()) {
    const { voices } = await (await tts()).getSupportedVoices();
    // Prefer offline voices; many Android voices report localService=false, so fall back to all installed ones.
    const all = voices.map((v, nativeIndex) => ({ ...v, nativeIndex }));
    const local = all.filter(v => v.localService);
    return local.length ? local : all.length ? all : [{ voiceURI: "android-default", name: "Android default voice", lang: navigator.language || "en-US", nativeIndex: -1 }];
  }
  return window.speechSynthesis?.getVoices().filter(v => v.localService) ?? [];
}
let cancelPending: (() => void) | undefined;
export async function stopSpeech() {
  cancelPending?.(); cancelPending = undefined;
  if (isNativeAndroid()) await (await tts()).stop();
  else window.speechSynthesis?.cancel();
}
export async function speakLocal(text: string, selected: LocalVoice, rate = COMPANION_RATE) {
  await stopSpeech();
  const TextToSpeech = isNativeAndroid() ? await tts() : undefined;
  // Native stop clears plugin callbacks without settling speak; settle our own wait on cancellation.
  return new Promise<void>((resolve, reject) => {
    const done = () => { if (cancelPending === done) cancelPending = undefined; resolve(); };
    cancelPending = done;
    if (TextToSpeech) {
      if (selected.nativeIndex === undefined) { done(); reject(new Error("Select an installed on-device voice.")); return; }
      TextToSpeech.speak({ text, lang: selected.lang, ...(selected.nativeIndex >= 0 ? { voice: selected.nativeIndex } : {}), rate, queueStrategy: 0 })
        .then(done, error => { done(); reject(error); });
    } else {
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