// Non-sensitive look-and-feel preferences. Kept outside the encrypted vault because the
// cover must render (and sounds may play) while the diary is locked. No diary content here.
import { useSyncExternalStore } from "react";

export type Cover = "green" | "plum";
type Prefs = { cover: Cover; coverChosen: boolean; sounds: boolean };
const KEY = "diary-appearance";
const DEFAULTS: Prefs = { cover: "green", coverChosen: false, sounds: true };
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try { cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { cache = DEFAULTS; }
  return cache!;
}
export function getAppearance() { return read(); }
export function setAppearance(p: Partial<Prefs>) {
  cache = { ...read(), ...p };
  localStorage.setItem(KEY, JSON.stringify(cache));
  applyCover();
  listeners.forEach((l) => l());
}
export function applyCover() {
  document.documentElement.dataset["cover"] = read().cover;
}
export function useAppearance() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => DEFAULTS);
}

/** Where the last unlock touch landed, as % of the viewport, so the light starts there. */
export const touchPoint = { x: 50, y: 70 };
