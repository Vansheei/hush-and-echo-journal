import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { isNativeAndroid } from "./platform";

type Insets = { top: number; bottom: number; left: number; right: number };
const DiaryInsets = registerPlugin<{
  getInsets(): Promise<Insets>;
  addListener(event: "insetsChanged", listener: (insets: Insets) => void): Promise<PluginListenerHandle>;
}>("DiaryInsets");

export function applyNativeInsets(insets: Insets) {
  for (const side of ["top", "bottom", "left", "right"] as const) {
    const value = insets[side];
    if (Number.isFinite(value)) document.documentElement.style.setProperty(`--native-safe-${side}`, `${Math.max(0, value)}px`);
  }
}

export async function startNativeInsets(): Promise<() => void> {
  if (!isNativeAndroid()) return () => {};
  const { StatusBar } = await import("@capacitor/status-bar");
  await StatusBar.setOverlaysWebView({ overlay: true });
  const listener = await DiaryInsets.addListener("insetsChanged", applyNativeInsets);
  try { applyNativeInsets(await DiaryInsets.getInsets()); }
  catch (error) { await listener.remove(); throw error; }
  return () => { void listener.remove(); };
}