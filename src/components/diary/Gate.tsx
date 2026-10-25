import type { ReactNode } from "react";
import { useVault } from "@/lib/vault-context";
import { LockScreen } from "./LockScreen";
import { SetupScreen } from "./SetupScreen";

export function Gate({ children }: { children: ReactNode }) {
  const { status } = useVault();
  if (status === "loading") return <div className="screen-center text-muted-foreground">…</div>;
  if (status === "setup") return <SetupScreen />;
  if (status === "locked") return <LockScreen />;
  return <>{children}</>;
}
