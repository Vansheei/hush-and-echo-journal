import { useEffect, useState, type CSSProperties } from "react";
import { BookCover } from "./BookCover";
import { touchPoint } from "@/lib/appearance";
import { pageTurn } from "@/lib/sounds";

const SPECKS = [-40, -22, -8, 6, 18, 34, 48];

/** ~2s: light spreads from the touch along the gold lines, ornament glows, cover swings open, pages flutter. */
export function UnlockOverlay({ onDone }: { onDone: () => void }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(pageTurn, 1450);
    const t2 = setTimeout(() => { setGone(true); onDone(); }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  if (gone) return null;
  const style = { "--tx": `${touchPoint.x}%`, "--ty": `${touchPoint.y}%` } as CSSProperties;
  return (
    <div className="unlock-overlay" style={style} aria-hidden>
      <div className="relative w-[min(100%,22rem)]">
        <div className="absolute inset-0"><div className="flutter" /><div className="flutter" /><div className="flutter" /></div>
        <div className="book-swing relative"><BookCover lit /></div>
        {SPECKS.map((dx, i) => (
          <span key={i} className="gold-speck" style={{ left: `${50 + dx / 3}%`, top: "42%", animationDelay: `${1.1 + i * 0.07}s`, "--dx": `${dx}px` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
