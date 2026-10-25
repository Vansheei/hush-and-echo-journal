import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { isNativeAndroid } from "./platform";

export const COMPANION_RATE = 1.15;
export type LocalVoice = { voiceURI: string; name: string; lang: string; nativeIndex?: number };
export async function localVoices(): Promise<LocalVoice[]> {
  if (isNativeAndroid()) {
    const { voices } = await TextToSpeech.getSupportedVoices();
    return voices.map((v, nativeIndex) => ({ ...v, nativeIndex })).filter(v => v.localService);
  }
  return window.speechSynthesis?.getVoices().filter(v => v.localService) ?? [];
}
let cancelPending: (() => void) | undefined;
export async function stopSpeech() {
  cancelPending?.(); cancelPending = undefined;
  if (isNativeAndroid()) await TextToSpeech.stop();
  else window.speechSynthesis?.cancel();
}
export async function speakLocal(text: string, selected: LocalVoice) {
  await stopSpeech();
  // Native stop clears plugin callbacks without settling speak; settle our own wait on cancellation.
  return new Promise<void>((resolve, reject) => {
    const done = () => { if (cancelPending === done) cancelPending = undefined; resolve(); };
    cancelPending = done;
    if (isNativeAndroid()) {
      if (selected.nativeIndex === undefined) { done(); reject(new Error("Select an installed on-device voice.")); return; }
      TextToSpeech.speak({ text, lang: selected.lang, voice: selected.nativeIndex, rate: COMPANION_RATE, queueStrategy: 0 })
        .then(done, error => { done(); reject(error); });
    } else {
      const voice = window.speechSynthesis?.getVoices().find(v => v.voiceURI === selected.voiceURI && v.localService);
      if (!voice) { done(); reject(new Error("No on-device voice is installed. Text replies remain available.")); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = COMPANION_RATE;
      utterance.onend = done;
      utterance.onerror = () => { done(); reject(new Error("Voice playback failed. Text replies remain available.")); };
      window.speechSynthesis.speak(utterance);
    }
  });
}