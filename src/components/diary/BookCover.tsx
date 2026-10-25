import { t, useLanguage } from "@/lib/i18n";
import type { CSSProperties, ReactNode } from "react";
import { useAppearance, type Cover } from "@/lib/appearance";

const COVER_ART = { green: "/art/cover-green.webp", plum: "/art/cover-burgundy.webp", ocean: "/art/cover-blue.webp" } as const;

/** A single feathery dandelion seed: a fine stalk with a soft tuft. */
function Seed() {
  useLanguage();
  return (
    <svg viewBox="-10 -12 20 24" className="size-full" aria-hidden>
      <path d="M0 -4 L0 10" stroke="oklch(0.95 0.03 90)" strokeWidth="0.5" />
      {[-70, -45, -22, 0, 22, 45, 70].map((a) => (
        <path key={a} d="M0 -4 L0 -11" stroke="oklch(0.97 0.02 90)" strokeWidth="0.35" transform={`rotate(${a} 0 -4)`} />
      ))}
      <ellipse cx="0" cy="10.5" rx="0.7" ry="1.2" fill="oklch(0.8 0.05 80)" />
    </svg>
  );
}

// Dandelion heads in the art (x%, y%); seeds drift up and away from them.
const HEADS: [number, number][] = [[18, 64], [23, 74], [82, 79]];
const SEEDS = HEADS.flatMap(([x, y], h) => [0, 1, 2, 3, 4].map((i) => ({
  x, y, d: 0.3 + h * 0.25 + i * 0.22, tx: (i - 2) * 4 + (x < 50 ? 4 : -4), ty: -(14 + i * 5),
})));
// Daffodils in the art: they glow softly in place.
const DAFFS: [number, number][] = [[9, 86], [14, 88], [92, 85], [88, 91]];

export function BookCover({ children, lit = false, variant }: { children?: ReactNode; lit?: boolean; variant?: Cover }) {
  useLanguage();
  const chosen = useAppearance().cover;
  const cover = variant ?? chosen;
  return (
    <div className="book-cover [container-type:inline-size]">
      <img src={COVER_ART[cover] ?? COVER_ART.green} alt={t("Vanshika’s Diary")} className={`absolute inset-0 size-full object-cover ${lit ? "cover-art-lit" : ""}`} draggable={false} />
      {lit && DAFFS.map(([x, y], i) => (
        <span key={`d${i}`} className="daffodil-glow" style={{ left: `${x}%`, top: `${y}%`, "--d": `${0.3 + i * 0.2}s` } as CSSProperties} />
      ))}
      {lit && SEEDS.map((s, i) => (
        <span key={i} className="seed-fly" style={{ left: `${s.x}%`, top: `${s.y}%`, "--d": `${s.d}s`, "--tx": `${s.tx}cqw`, "--ty": `${s.ty}cqw` } as CSSProperties}>
          <Seed />
        </span>
      ))}
      {children && <div className="absolute inset-x-8 bottom-[15%]">{children}</div>}
    </div>
  );
}
