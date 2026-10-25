import type { ReactNode } from "react";

/** Flat gold tooling: double border, corner fleurons, spine bands, centre ornament + name plate. */
function Tooling({ className }: { className?: string }) {
  const corner = "M0 0 C 14 2, 22 10, 24 24 M0 0 C 2 14, 10 22, 24 24 M8 8 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0";
  return (
    <svg viewBox="0 0 300 420" className={`absolute inset-0 size-full ${className ?? ""}`} fill="none" stroke="currentColor" aria-hidden>
      <rect x="14" y="14" width="272" height="392" rx="3" strokeWidth="1.4" />
      <rect x="21" y="21" width="258" height="378" rx="2" strokeWidth="0.6" strokeDasharray="1 3" />
      {[[26, 26, 0], [274, 26, 90], [274, 394, 180], [26, 394, 270]].map(([x, y, r]) => (
        <path key={r} d={corner} transform={`translate(${x} ${y}) rotate(${r})`} strokeWidth="0.9" />
      ))}
      {[70, 350].map((y) => (
        <g key={y} strokeWidth="0.7">
          <line x1="60" x2="240" y1={y} y2={y} />
          <path d={`M120 ${y} q15 -9 30 0 q15 9 30 0`} />
          <line x1="60" x2="240" y1={y + 5} y2={y + 5} strokeDasharray="2 4" />
        </g>
      ))}
    </svg>
  );
}

function Ornament() {
  return (
    <svg viewBox="0 0 120 60" className="mx-auto w-24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      <path d="M60 8 L68 30 L60 52 L52 30 Z" />
      <circle cx="60" cy="30" r="5" />
      <path d="M8 30 C 25 14, 40 14, 50 30 C 40 46, 25 46, 8 30 M112 30 C 95 14, 80 14, 70 30 C 80 46, 95 46, 112 30" />
    </svg>
  );
}

export function BookCover({ children, lit = false }: { children?: ReactNode; lit?: boolean }) {
  return (
    <div className="book-cover">
      <Tooling />
      {lit && <div className="cover-lit cover-gold-lit absolute inset-0"><Tooling /></div>}
      <div className="absolute inset-x-0 top-[24%] flex flex-col items-center gap-3">
        <div className={`cover-ornament ${lit ? "" : ""}`}><Ornament /></div>
        <div className="rounded-sm border border-gold px-6 py-1 outline outline-1 outline-offset-2 outline-gold/60">
          <span className="font-display text-4xl text-gold">Diary</span>
        </div>
      </div>
      {children && <div className="absolute inset-x-6 bottom-8">{children}</div>}
    </div>
  );
}
