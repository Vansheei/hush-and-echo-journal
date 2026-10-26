/** Hold the screen awake for the life of a job. Android freezes the WebView's
 *  JavaScript once the screen sleeps, which would stall recording or transcription. */
export function keepAwake() {
  let lock: WakeLockSentinel | null = null;
  let released = false;
  const acquire = () => navigator.wakeLock?.request("screen")
    .then(l => { if (released) void l.release().catch(() => {}); else lock = l; })
    .catch(() => {});
  const onVisible = () => { if (document.visibilityState === "visible" && !lock && !released) void acquire(); };
  void acquire();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    released = true;
    document.removeEventListener("visibilitychange", onVisible);
    void lock?.release().catch(() => {});
    lock = null;
  };
}
