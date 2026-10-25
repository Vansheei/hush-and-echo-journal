import type { CSSProperties } from "react";

const SWAN = "M2 26 C 10 30, 30 30, 38 22 C 33 20, 28 15, 30 8 C 31 3, 36 2, 37 6 L 40 6.5 L 36.5 8 C 34 13, 37 18, 41 19 C 46 12, 54 14, 52 24 C 44 32, 10 32, 2 26 Z";

function Lotus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C -4 -6, -3 -12, 0 -16 C 3 -12, 4 -6, 0 0 Z M0 0 C -8 -3, -11 -9, -10 -13 C -5 -10, -2 -5, 0 0 Z M0 0 C 8 -3, 11 -9, 10 -13 C 5 -10, 2 -5, 0 0 Z M-12 1 C -6 3, 6 3, 12 1" />
    </g>
  );
}

function Butterfly({ style }: { style: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 30" className="page-butterfly" style={style} aria-hidden>
      <path d="M20 15 C 14 2, 2 2, 4 11 C 5 16, 12 17, 20 15 Z M20 15 C 26 2, 38 2, 36 11 C 35 16, 28 17, 20 15 Z M20 15 C 14 20, 8 27, 13 28 C 17 28, 19 22, 20 15 Z M20 15 C 26 20, 32 27, 27 28 C 23 28, 21 22, 20 15 Z" fill="currentColor" />
    </svg>
  );
}

/** Thin art-nouveau frame with lotus corners, a small swan, faint script and a few drifting butterflies. */
export function PageFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-frame" aria-hidden>
      <div className="absolute inset-2 rounded-sm border border-current opacity-50" />
      <div className="absolute inset-3 rounded-sm border border-current opacity-25" />
      <svg viewBox="0 0 120 90" className="absolute left-1 top-1 w-28" fill="none" stroke="currentColor" strokeWidth="0.9">
        <path d="M6 86 C 6 40, 20 14, 60 10 C 80 8, 96 12, 116 6" />
        <path d="M14 60 C 22 50, 30 48, 36 54 M40 12 C 44 22, 52 24, 58 18" />
        <Lotus x={24} y={34} s={0.9} /><Lotus x={78} y={14} s={0.6} />
      </svg>
      <svg viewBox="0 0 120 90" className="absolute right-1 top-1 w-20 -scale-x-100" fill="none" stroke="currentColor" strokeWidth="0.9">
        <path d="M6 86 C 6 40, 20 14, 60 10 C 80 8, 96 12, 116 6" /><Lotus x={26} y={36} s={0.7} />
      </svg>
      <svg viewBox="0 0 160 60" className="absolute bottom-1 right-1 w-36" fill="none" stroke="currentColor" strokeWidth="0.9">
        <path d="M4 54 C 40 48, 120 50, 156 54 M20 50 C 34 46, 50 46, 64 50" />
        <Lotus x={22} y={50} /><Lotus x={44} y={52} s={0.7} />
        <path d={SWAN} transform="translate(92 18)" fill="currentColor" fillOpacity="0.12" />
        <path d="M86 52 q6 -2 12 0 q6 2 12 0 q6 -2 12 0" strokeWidth="0.6" />
      </svg>
      <svg viewBox="0 0 200 120" className="absolute right-6 top-40 w-56 opacity-[0.07]" fill="none" stroke="currentColor" strokeWidth="1.1">
        {[0, 18, 36, 54, 72, 90].map((y) => <path key={y} d={`M4 ${y + 10} c 8 -6, 14 6, 22 0 s 12 -8, 20 0 s 14 4, 22 -2 s 10 6, 18 0 s 16 -6, 24 0 s 12 4, 20 -1 s 14 5, 22 0 s 10 -4, 18 1`} />)}
      </svg>
      <Butterfly style={{ left: "6%", top: "9rem", width: 26, animationDelay: "0s" }} />
      <Butterfly style={{ left: "13%", top: "15rem", width: 18, animationDelay: "-3s" }} />
      <Butterfly style={{ left: "4%", top: "22rem", width: 22, animationDelay: "-6s" }} />
      <Butterfly style={{ left: "10%", top: "30rem", width: 14, animationDelay: "-9s" }} />
    </div>
  );
}
