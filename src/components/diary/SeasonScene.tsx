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
  autumn: { label: "Autumn", nature: <Wind className={ICON} />, life: <><Coffee className={ICON} /></> },
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
          {[8, 30, 55, 74, 90].map((left, i) => (
            <Leaf key={left} className={`season-leaf w-3 ${["text-tape-2", "text-tape-1", "text-tape-4"][i % 3]}`} style={{ left: `${left}%`, animationDuration: `${14 + i * 3}s`, animationDelay: `${i * -4}s` }} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 px-4 pb-3 text-muted-foreground/70" aria-label={`${s.label}`}>
        <span className="flex items-center gap-1.5">{season === "autumn" ? <><Leaf className="w-4 text-tape-2" /><Leaf className="w-3 text-tape-1" /></> : s.nature}</span>
        <span className="h-px flex-1 bg-border" />
        <span className="flex items-center gap-2">{s.life}</span>
      </div>
    </>
  );
}
