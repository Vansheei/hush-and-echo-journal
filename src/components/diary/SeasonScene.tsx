import { CloudSun, Coffee, IceCreamCone, Shirt, Sun, Car, Utensils, Tent, Flower2, Wind, Sunrise } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";

export type Season = "spring" | "summer" | "autumn" | "winter";

/**
 * Season from the date (northern hemisphere).
 * Placeholder: `tempC` will later nudge this by local temperature (e.g. a warm October).
 */
export function seasonFor(date: Date, _tempC?: number): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

function Leaf({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden><path d="M2 18 C 2 8, 8 2, 18 2 C 18 12, 12 18, 2 18 Z M2 18 L 12 8" fill="currentColor" stroke="var(--paper)" strokeWidth="0.8" /></svg>;
}
/** Outlined maple leaf with veins, like a hand-inked autumn sticker. */
function Maple({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 44" className={className} style={style} aria-hidden>
      <path d="M20 2 L23 11 L29 7 L27 16 L36 13 L32 21 L39 24 L30 28 L32 34 L23 31 L21 36 L19 36 L17 31 L8 34 L10 28 L1 24 L8 21 L4 13 L13 16 L11 7 L17 11 Z"
        fill="currentColor" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 36 V43 M20 33 V8 M20 26 L30 15 M20 26 L10 15 M20 30 L33 25 M20 30 L7 25" stroke="var(--ink)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </svg>
  );
}
/** Five-fingered leaf (chestnut style). */
function Palm({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 44" className={className} style={style} aria-hidden>
      {[-70, -35, 0, 35, 70].map((r) => (
        <path key={r} d="M20 26 C 15 18, 16 8, 20 2 C 24 8, 25 18, 20 26 Z" transform={`rotate(${r} 20 26)`} fill="currentColor" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
      ))}
      <path d="M20 26 L22 42" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function Snowman({ className }: { className?: string }) {
  return <svg viewBox="0 0 20 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden><circle cx="10" cy="7" r="4" /><circle cx="10" cy="19" r="7" /><path d="M6 11 h8" strokeWidth="2.2" /></svg>;
}
function Scarf({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M4 7 q8 5 16 0 M6 9 l-1 11 h4 l1 -10 M5 14 h4" /></svg>;
}
function Cafe({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M3 10 h18 M12 10 v10 M8 20 h8 M6 10 l6 -6 l6 6" /></svg>;
}

const ICON = "size-5";
const SCENES: Record<Season, { label: string; nature: ReactNode; life: ReactNode }> = {
  autumn: { label: "Autumn", nature: null, life: null },
  winter: {
    label: "Winter",
    nature: <><CloudSun className={`${ICON} season-wind`} /><Wind className={`${ICON} season-wind`} /></>,
    life: <><Coffee className={ICON} /><Scarf className={ICON} /><Shirt className={ICON} /><Snowman className="h-6" /></>,
  },
  spring: { label: "Spring", nature: <Flower2 className={ICON} />, life: <><IceCreamCone className={ICON} /><Cafe className={ICON} /><Flower2 className={ICON} /></> },
  summer: {
    label: "Summer",
    nature: <Sun className={`${ICON} season-heat`} />,
    life: <><Utensils className={ICON} /><Sunrise className={ICON} /><Tent className={ICON} /><Car className={ICON} /></>,
  },
};

/** Quiet strip under the header (home/timeline only). The season and its pleasures sit side by side. */
export function SeasonScene({ date = new Date() }: { date?: Date }) {
  const season = seasonFor(date);
  const s = SCENES[season];
  return (
    <>
      {season === "autumn" && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-0 max-w-[40rem]" aria-hidden>
          {[6, 20, 34, 48, 62, 76, 90].map((left, i) => {
            const Shape = [Leaf, Maple, Leaf, Palm, Maple, Leaf, Palm][i]!;
            const color = ["text-tape-2", "text-leaf-1", "text-tape-1", "text-leaf-3", "text-leaf-2", "text-tape-4", "text-leaf-2"][i];
            const size = Shape === Leaf ? "w-3" : "w-6 opacity-80";
            return <Shape key={left} className={`season-leaf ${size} ${color}`} style={{ left: `${left}%`, animationDuration: `${14 + (i % 4) * 3}s`, animationDelay: `${i * -3}s` }} />;
          })}
        </div>
      )}
      <div className="flex items-center gap-3 px-4 pb-3 text-muted-foreground/70" aria-label={`${s.label}`}>
        <span className="flex items-center gap-1.5">{season === "autumn" ? <><Maple className="w-5 text-leaf-2" /><Leaf className="w-3 text-tape-1" /><Palm className="w-4 text-leaf-3" /></> : s.nature}</span>
        {s.life && <><span className="h-px flex-1 bg-border" />
        <span className="flex items-center gap-2">{s.life}</span></>}
      </div>
    </>
  );
}
