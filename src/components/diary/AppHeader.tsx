import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useVault } from "@/lib/vault-context";
import { PageFrame } from "./PageFrame";

/** Curled parchment scroll banner holding a page title. */
export function ScrollBanner({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[24rem] [container-type:inline-size]">
      <svg viewBox="0 0 320 90" className="block w-full" aria-hidden>
        <defs>
          <linearGradient id="scroll-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--scroll-edge)" />
            <stop offset="0.35" stopColor="var(--scroll-light)" />
            <stop offset="0.7" stopColor="var(--scroll-light)" />
            <stop offset="1" stopColor="var(--scroll-edge)" />
          </linearGradient>
        </defs>
        {/* tucked-under backs of the curls */}
        <path d="M34 56 L 24 62 L 36 70 Z" fill="var(--scroll-shadow)" />
        <path d="M286 28 L 298 22 L 286 16 Z" fill="var(--scroll-shadow)" />
        {/* main band, gently waved, torn ends */}
        <path d="M30 22 C 90 14, 150 30, 210 20 C 240 15, 266 16, 290 22 L 287 30 L 292 38 L 288 46 L 291 56 C 260 50, 236 52, 206 58 C 150 68, 90 50, 33 60 L 36 52 L 30 44 L 35 36 Z" fill="url(#scroll-body)" stroke="var(--scroll-ink)" strokeWidth="0.8" />
        {/* rolled ends: small spirals */}
        <path d="M34 60 C 24 62, 22 74, 30 76 C 37 78, 40 70, 34 68 C 30 67, 29 72, 32 72" fill="var(--scroll-edge)" stroke="var(--scroll-ink)" strokeWidth="0.8" />
        <path d="M289 22 C 298 20, 300 8, 292 6 C 285 4, 282 12, 288 14 C 292 15, 293 10, 290 10" fill="var(--scroll-edge)" stroke="var(--scroll-ink)" strokeWidth="0.8" />
        <path d="M60 30 C 120 24, 180 38, 260 28" stroke="var(--scroll-ink)" strokeWidth="0.4" opacity="0.35" fill="none" />
      </svg>
      <h1 className="absolute inset-x-[14%] top-[18%] truncate text-center font-display text-[9.5cqw] leading-[1.25] text-ink">{children}</h1>
    </div>
  );
}

export function AppHeader({ title, back }: { title: ReactNode; back?: boolean }) {
  const { lock } = useVault();
  return (
    <>
      <PageFrame />
      <header className="relative z-10 px-4 pt-3">
        <div className="flex items-center gap-1 text-frame">
          {back ? (
            <Link to="/" className="icon-btn" aria-label="Back"><ArrowLeft className="size-5" /></Link>
          ) : <span className="size-10" />}
          <span className="flex-1" />
          <Link to="/settings" className="icon-btn" aria-label="Settings"><Settings className="size-5" /></Link>
          <button className="icon-btn" aria-label="Lock now" onClick={lock}><Lock className="size-5" /></button>
        </div>
        <div className="-mt-3 mb-2"><ScrollBanner>{title}</ScrollBanner></div>
      </header>
    </>
  );
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
