import { useEffect } from "react";
import { startNativeInsets } from "@/lib/native/insets";

export function NativeInsets() {
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    void startNativeInsets().then(cleanup => {
      if (active) stop = cleanup;
      else cleanup();
    }).catch(() => { console.warn("Android screen insets unavailable; using browser safe areas."); });
    return () => { active = false; stop?.(); };
  }, []);
  return null;
}