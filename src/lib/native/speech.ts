import { isNativeAndroid } from "./platform";

// The plugin touches `window` at import time, so load it only on Android (never during server rendering).
const tts = async () => (await import("@capacitor-community/text-to-speech")).TextToSpeech;

export const COMPANION_RATE = 1.15;
export type LocalVoice = { voiceURI: string; name: string; lang: string; nativeIndex?: number };
export const ANDROID_DEFAULT_VOICE: LocalVoice = { voiceURI: "android-default", name: "Android default voice", lang: "en-US", nativeIndex: -1 };
export async function localVoices(): Promise<LocalVoice[]> {
  if (isNativeAndroid()) {
    // Talk to the Android engine directly. No localService filter: Google voices often report false
    // even when the voice data is installed. The engine default is always offered first.
    const voices = await (await tts()).getSupportedVoices().then(r => r.voices).catch(() => []);
    return [ANDROID_DEFAULT_VOICE, ...voices.map((v, nativeIndex) => ({ ...v, nativeIndex }))];
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
      const index = selected.nativeIndex ?? -1;
      TextToSpeech.speak({ text, lang: selected.lang, ...(index >= 0 ? { voice: index } : {}), rate, queueStrategy: 0 })
        .then(done, error => { done(); reject(new Error(`Android text-to-speech engine: ${error instanceof Error ? error.message : String(error)}`)); });
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