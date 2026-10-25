import type { CSSProperties, ReactNode } from "react";
import coverArt from "@/assets/cover-art.jpg";

/** A small daffodil: six pale petals around a golden trumpet. */
function Daffodil() {
  return (
    <svg viewBox="-10 -10 20 20" className="size-full" aria-hidden>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="0" cy="-5" rx="2.6" ry="5" transform={`rotate(${a})`} fill="oklch(0.9 0.11 95)" stroke="oklch(0.65 0.12 80)" strokeWidth="0.4" />
      ))}
      <circle r="3" fill="oklch(0.78 0.16 75)" stroke="oklch(0.6 0.14 60)" strokeWidth="0.5" />
      <circle r="1.3" fill="oklch(0.65 0.15 60)" />
    </svg>
  );
}

// Start points along the bottom flower beds (x%, y%) — they drift up to the title.
const DAFFS: [number, number, number][] = [
  [10, 84, 0.3], [16, 90, 0.55], [88, 86, 0.45], [84, 93, 0.75], [24, 78, 0.9], [78, 80, 1.05], [12, 70, 1.2], [90, 72, 1.35],
];

export function BookCover({ children, lit = false }: { children?: ReactNode; lit?: boolean }) {
  return (
    <div className="book-cover [container-type:inline-size]">
      <img src={coverArt} alt="" className={`absolute inset-0 size-full object-cover ${lit ? "cover-art-lit" : ""}`} draggable={false} />
      {lit && DAFFS.map(([x, y, d], i) => (
        <span key={i} className="daffodil-fly" style={{ left: `${x}%`, top: `${y}%`, "--d": `${d}s`, "--tx": `${50 - x}cqw`, "--ty": `${(36 - y) * 1.4}cqw` } as CSSProperties}>
          <Daffodil />
        </span>
      ))}
      <div className="absolute inset-x-0 top-[33%] flex flex-col items-center">
        <span className={`font-display text-[15cqw] leading-tight text-gold ${lit ? "title-lit" : ""}`}>Vanshi’s Diary</span>
        <span className="mt-1 h-px w-[30cqw] bg-gold/60" />
      </div>
      {children && <div className="absolute inset-x-8 bottom-[15%]">{children}</div>}
    </div>
  );
}
