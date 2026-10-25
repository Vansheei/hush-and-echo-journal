import type { CSSProperties, ReactNode } from "react";

// Deterministic star field so the cover looks identical every render.
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: 18 + r(1) * 264, y: 18 + r(2) * 384, s: 0.3 + r(3) * 0.9, o: 0.35 + r(4) * 0.6 };
});
const SPARKS: [number, number][] = [[150, 70], [232, 168], [72, 300], [214, 330], [118, 120], [260, 250]];

// Vines climb from the bottom; leaves/flowers carry a delay so the lit sweep reaches them in order.
const LEFT_VINE = "M34 412 C 52 360, 18 318, 38 266 S 20 170, 44 118 S 40 52, 70 30";
const LEAVES: [number, number, number][] = [
  [40, 380, -30], [30, 340, 40], [34, 296, -40], [28, 250, 35], [30, 210, -35], [36, 168, 30], [42, 130, -25], [48, 88, 35], [58, 52, -20],
];
const FLOWERS: [number, number][] = [[44, 356], [24, 272], [40, 190], [46, 104], [72, 34]];

function Star({ x, y, s }: { x: number; y: number; s: number }) {
  return <path d={`M${x} ${y - s * 5} L${x + s} ${y - s} L${x + s * 5} ${y} L${x + s} ${y + s} L${x} ${y + s * 5} L${x - s} ${y + s} L${x - s * 5} ${y} L${x - s} ${y - s} Z`} fill="currentColor" />;
}

function Vine({ mirror, lit }: { mirror?: boolean | undefined; lit?: boolean | undefined }) {
  return (
    <g transform={mirror ? "translate(300 0) scale(-1 1)" : undefined}>
      <path d={LEFT_VINE} pathLength={1} className={lit ? "vine-draw" : undefined} stroke="currentColor" strokeWidth="1.1" fill="none" />
      {LEAVES.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="7" ry="2.6" transform={`rotate(${r} ${x} ${y}) translate(${r > 0 ? 6 : -6} 0)`}
          className={lit ? "leaf-lit" : "fill-[var(--cover-leaf)]"} style={{ "--d": `${0.5 + (412 - y) / 412 * 1.1}s` } as CSSProperties} stroke="currentColor" strokeWidth="0.5" />
      ))}
      {FLOWERS.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className={lit ? "bloom" : undefined} style={{ "--d": `${0.8 + i * 0.28}s` } as CSSProperties}>
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-3.6" rx="2" ry="3.4" transform={`rotate(${a})`} fill="var(--cover-bloom)" stroke="currentColor" strokeWidth="0.4" />)}
            <circle r="1.4" fill="currentColor" />
          </g>
        </g>
      ))}
    </g>
  );
}

/** Original celestial-forest cover art: speckled night green, light rays, moons, stars, climbing vines. */
function CelestialArt({ lit }: { lit?: boolean | undefined }) {
  return (
    <svg viewBox="0 0 300 420" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id="ray" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="var(--gold-bright)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--gold-bright)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mist" cx="50%" cy="45%" r="70%">
          <stop offset="0.55" stopColor="var(--cover-deep)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--cover-shadow)" stopOpacity="0.85" />
        </radialGradient>
        <filter id="speckle"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.8  0 0 0 0.9 -0.55" /></filter>
        <filter id="burn"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="9" /><feDisplacementMap in="SourceGraphic" scale="9" /></filter>
        <mask id="crescent"><rect width="300" height="420" fill="white" /><circle cx="84" cy="62" r="22" fill="black" /></mask>
      </defs>
      <rect width="300" height="420" filter="url(#speckle)" opacity="0.18" />
      <g className="cover-rays">
        <polygon points="120,0 150,0 260,420 200,420" fill="url(#ray)" />
        <polygon points="170,0 186,0 290,360 262,380" fill="url(#ray)" />
        <polygon points="80,0 96,0 170,420 140,420" fill="url(#ray)" opacity="0.6" />
      </g>
      <rect width="300" height="420" fill="url(#mist)" />
      <g className="text-gold">
        {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="currentColor" opacity={s.o} />)}
        {SPARKS.map(([x, y], i) => <Star key={i} x={x} y={y} s={1.1} />)}
      </g>
      <g className={lit ? "moon-lit text-gold" : "text-gold"}>
        <circle cx="72" cy="72" r="24" fill="var(--moon)" mask="url(#crescent)" stroke="currentColor" strokeWidth="0.6" />
        <Star x={92} y={80} s={2} />
        <circle cx="232" cy="66" r="26" fill="var(--moon)" opacity="0.92" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="224" cy="60" r="5" fill="var(--moon-shade)" /><circle cx="242" cy="76" r="3.5" fill="var(--moon-shade)" /><circle cx="236" cy="54" r="2.4" fill="var(--moon-shade)" />
        <circle cx="70" cy="372" r="16" fill="var(--moon)" mask="url(#crescent)" transform="translate(-14 300) scale(1.2 1.2) translate(0 -300)" opacity="0.8" />
      </g>
      <g className={lit ? "text-gold-bright" : "text-gold"}><Vine lit={lit} /><Vine mirror lit={lit} /></g>
      <rect x="4" y="4" width="292" height="412" rx="6" fill="none" stroke="var(--gold-dim)" strokeWidth="5" filter="url(#burn)" opacity="0.75" />
      <rect x="12" y="12" width="276" height="396" rx="3" fill="none" stroke="var(--gold)" strokeWidth="0.6" opacity="0.6" />
    </svg>
  );
}

export function BookCover({ children, lit = false }: { children?: ReactNode; lit?: boolean }) {
  return (
    <div className="book-cover [container-type:inline-size]">
      <CelestialArt lit={lit} />
      <div className="absolute inset-x-0 top-[30%] flex flex-col items-center">
        <span className={`font-display text-[17cqw] leading-tight text-gold ${lit ? "title-lit" : ""}`}>Diary</span>
        <span className="mt-1 h-px w-[30cqw] bg-gold/60" />
      </div>
      {children && <div className="absolute inset-x-8 bottom-[15%]">{children}</div>}
    </div>
  );
}
