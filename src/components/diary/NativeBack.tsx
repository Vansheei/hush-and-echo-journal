import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { App } from "@capacitor/app";
import { isNativeAndroid } from "@/lib/native/platform";
import { handleNativeBack } from "@/lib/native/back";

export function NativeBack() {
  const router = useRouter();
  useEffect(() => {
    if (!isNativeAndroid()) return;
    let active = true;
    const handle = App.addListener("backButton", () => {
      if (!active) return;
      void handleNativeBack({ canGoBack: router.history.canGoBack(), path: router.state.location.pathname,
        back: () => router.history.back(), home: () => { void router.navigate({ to: "/" }); }, exit: () => App.exitApp() });
    });
    return () => { active = false; void handle.then(h => h.remove()); };
  }, [router]);
  return null;
}