const TAPES = ["text-tape-1", "text-tape-2", "text-tape-3", "text-tape-4"];
export function tapeColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TAPES[Math.abs(h) % TAPES.length]!;
}

/** Audio = little cassette, video = little film reel, written = little page. Flat, coloured per entry. */
export function EntryToken({ kind, id }: { kind: "audio" | "video" | "written"; id: string }) {
  const color = tapeColor(id);
  if (kind === "audio")
    return (
      <svg viewBox="0 0 56 36" className={`w-14 shrink-0 ${color}`} aria-label="Audio entry" role="img">
        <rect x="1" y="1" width="54" height="34" rx="3" fill="currentColor" />
        <rect x="7" y="6" width="42" height="14" rx="2" fill="var(--paper)" opacity="0.9" />
        <circle cx="18" cy="13" r="4" fill="currentColor" /><circle cx="38" cy="13" r="4" fill="currentColor" />
        <rect x="22" y="11" width="12" height="4" fill="var(--ink)" opacity="0.6" />
        <path d="M14 34 L18 26 H38 L42 34" fill="var(--ink)" opacity="0.25" />
      </svg>
    );
  if (kind === "written")
    return (
      <svg viewBox="0 0 40 40" className={`w-11 shrink-0 ${color}`} aria-label="Written entry" role="img">
        <rect x="6" y="2" width="28" height="36" rx="2" fill="currentColor" />
        <rect x="10" y="6" width="20" height="28" rx="1" fill="var(--paper)" opacity="0.9" />
        {[10, 15, 20, 25].map((y) => <rect key={y} x="13" y={y} width="14" height="1.6" fill="var(--ink)" opacity="0.5" />)}
      </svg>
    );
  return (
    <svg viewBox="0 0 40 40" className={`w-11 shrink-0 ${color}`} aria-label="Video entry" role="img">
      <circle cx="20" cy="20" r="18" fill="currentColor" />
      <circle cx="20" cy="20" r="4" fill="var(--paper)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={20 + 10 * Math.cos((a * Math.PI) / 180)} cy={20 + 10 * Math.sin((a * Math.PI) / 180)} r="3.6" fill="var(--paper)" />
      ))}
    </svg>
  );
}

export function RibbonMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 30" className={`w-3.5 text-ribbon ${className}`} aria-label="Ribbon" role="img">
      <path d="M0 0 H14 V30 L7 23 L0 30 Z" fill="currentColor" />
    </svg>
  );
}
