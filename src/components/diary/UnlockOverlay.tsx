import { useEffect, useState, type CSSProperties } from "react";
import { BookCover } from "./BookCover";
import { pageTurn } from "@/lib/sounds";

const MOTES = [-60, -38, -20, -6, 8, 22, 40, 58];

/** ~3s: gold light rises from the bottom through the vines, flowers bloom one by one, then the book opens. */
export function UnlockOverlay({ onDone }: { onDone: () => void }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(pageTurn, reduce ? 0 : 2350);
    const t2 = setTimeout(() => { setGone(true); onDone(); }, reduce ? 350 : 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  if (gone) return null;
  return (
    <div className="unlock-overlay" aria-hidden>
      <div className="relative w-[min(100%,22rem)]">
        <div className="absolute inset-0"><div className="flutter" /><div className="flutter" /><div className="flutter" /></div>
        <div className="book-swing relative">
          <BookCover lit />
          <div className="rising-light" />
        </div>
        {MOTES.map((dx, i) => (
          <span key={i} className="gold-speck" style={{ left: `${50 + dx / 2.2}%`, bottom: "6%", animationDelay: `${0.2 + i * 0.16}s`, "--dx": `${dx / 3}px` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
