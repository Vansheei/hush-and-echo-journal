import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useVault } from "@/lib/vault-context";

export function AppHeader({ title, back }: { title: ReactNode; back?: boolean }) {
  const { lock } = useVault();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur">
      {back && (
        <Link to="/" className="icon-btn" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <h1 className="flex-1 truncate font-display text-2xl">{title}</h1>
      <Link to="/settings" className="icon-btn" aria-label="Settings">
        <Settings className="size-5" />
      </Link>
      <button className="icon-btn" aria-label="Lock now" onClick={lock}>
        <Lock className="size-5" />
      </button>
    </header>
  );
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
