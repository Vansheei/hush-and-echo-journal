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
        {/* back curls */}
        <path d="M22 50 C 10 50, 6 66, 18 72 C 28 76, 40 70, 40 60 L 40 50 Z" fill="var(--scroll-shadow)" />
        <path d="M298 22 C 310 22, 314 38, 302 44 C 292 48, 280 42, 280 32 L 280 22 Z" fill="var(--scroll-shadow)" />
        {/* main band, gently waved, torn ends */}
        <path d="M30 22 C 90 14, 150 30, 210 20 C 240 15, 266 16, 290 22 L 287 30 L 292 38 L 288 46 L 291 56 C 260 50, 236 52, 206 58 C 150 68, 90 50, 33 60 L 36 52 L 30 44 L 35 36 Z" fill="url(#scroll-body)" stroke="var(--scroll-ink)" strokeWidth="0.8" />
        {/* rolled ends */}
        <path d="M33 60 C 22 60, 18 72, 28 76 C 36 79, 44 74, 42 66" fill="var(--scroll-edge)" stroke="var(--scroll-ink)" strokeWidth="0.8" />
        <path d="M290 22 C 300 20, 306 10, 296 6 C 288 3, 280 8, 282 16" fill="var(--scroll-edge)" stroke="var(--scroll-ink)" strokeWidth="0.8" />
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
