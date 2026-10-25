import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useVault } from "@/lib/vault-context";
import { applyCover } from "@/lib/appearance";
import { lockSound } from "@/lib/sounds";
import { LockScreen } from "./LockScreen";
import { SetupScreen } from "./SetupScreen";
import { UnlockOverlay } from "./UnlockOverlay";

export function Gate({ children }: { children: ReactNode }) {
  const { status } = useVault();
  const prev = useRef(status);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => { applyCover(); }, []);
  useEffect(() => {
    if (prev.current === "locked" && status === "unlocked") setOpening(true);
    if (prev.current === "unlocked" && status === "locked") { setClosing(true); lockSound(); }
    prev.current = status;
  }, [status]);
  const done = useCallback(() => setOpening(false), []);
  if (status === "loading") return <div className="screen-center text-paper/70">…</div>;
  if (status === "setup") return <SetupScreen />;
  if (status === "locked") return <LockScreen closing={closing} />;
  return <>{children}{opening && <UnlockOverlay onDone={done} />}</>;
}
