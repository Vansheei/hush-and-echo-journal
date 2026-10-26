import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { pageTurn } from "@/lib/sounds";
import { registerBackHandler } from "@/lib/native/back";

type Turn = { dir: 1 | -1; p: number; settling?: boolean; commit?: boolean };

/** Drag with a finger to turn pages forwards or backwards; same animation and sound both ways. */
export function TurnableBook({ pages, page, onPage }: { pages: ReactNode[]; page: number; onPage: (n: number) => void }) {
  useLanguage();
  const [turn, setTurn] = useState<Turn | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; axis?: "x" | "y"; moved: boolean } | null>(null);
  const live = useRef<Turn | null>(null);
  const sheetEl = useRef<HTMLDivElement>(null);
  const shadeEl = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(timer.current); cancelAnimationFrame(frame.current); }, []);
  const angleOf = (t: Turn) => (t.dir === 1 ? -180 * t.p : -180 * (1 - t.p));
  // While dragging, move the sheet directly instead of re-rendering every page on each finger movement.
  const paint = () => {
    frame.current = 0; const t = live.current; if (!t || !sheetEl.current) return;
    const a = angleOf(t);
    sheetEl.current.style.transform = `rotateY(${a}deg)`;
    if (shadeEl.current) shadeEl.current.style.opacity = String(Math.sin((-a / 180) * Math.PI) * 0.5);
  };

  const finish = (t: Turn) => {
    live.current = null;
    const commit = t.p > 0.3;
    pageTurn();
    setTurn({ ...t, p: commit ? 1 : 0, settling: true, commit });
    timer.current = setTimeout(() => { if (commit) onPage(page + t.dir); setTurn(null); }, 560);
  };
  useEffect(() => registerBackHandler(() => {
    if (turn) return true;
    if (page <= 0) return false;
    finish({ dir: -1, p: 1 });
    return true;
  }), [page, turn, onPage]);

  const onDown = (e: React.PointerEvent) => { if (!turn?.settling) start.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.axis) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; }
    if (s.axis !== "x") return;
    s.moved = true;
    const dir: 1 | -1 = dx < 0 ? 1 : -1;
    if ((dir === 1 && page >= pages.length - 1) || (dir === -1 && page <= 0)) { live.current = null; setTurn(null); return; }
    const w = ref.current?.offsetWidth ?? 360;
    const next = { dir, p: Math.min(1, Math.abs(dx) / w) };
    const changed = live.current?.dir !== dir;
    live.current = next;
    if (changed) setTurn(next);
    else if (!frame.current) frame.current = requestAnimationFrame(paint);
  };
  const onUp = () => { const s = start.current; start.current = null; if (s?.moved && live.current && !turn?.settling) finish(live.current); };

  const under = turn ? pages[turn.dir === 1 ? page + 1 : page] : null;
  const sheet = turn ? pages[turn.dir === 1 ? page : page - 1] : null;
  const angle = turn ? (turn.dir === 1 ? -180 * turn.p : -180 * (1 - turn.p)) : 0;

  return (
    <div
      ref={ref}
      className="turn-book"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onClickCapture={(e) => { if (start.current?.moved || turn) { e.preventDefault(); e.stopPropagation(); } }}
    >
      <div className="turn-page">{turn ? under : pages[page]}</div>
      {turn && (
        <div ref={sheetEl} className="turn-sheet"
          style={{ transform: `rotateY(${angle}deg)`, transition: turn.settling ? "transform 0.55s cubic-bezier(.4,.1,.3,1)" : "none" }}>
          <div className="turn-face">{sheet}</div>
          <div ref={shadeEl} className="turn-shade" style={{ opacity: Math.sin((-angle / 180) * Math.PI) * 0.5 }} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <button type="button" disabled={page <= 0 || !!turn} onClick={() => finish({ dir: -1, p: 1 })} className="rounded-full border border-border px-3 py-0.5 disabled:opacity-30">{t("‹ Back")}</button>
        <span>{t("Page")} {page + 1} {t("of")} {pages.length} {t("· drag to turn")}</span>
        <button type="button" disabled={page >= pages.length - 1 || !!turn} onClick={() => finish({ dir: 1, p: 1 })} className="rounded-full border border-border px-3 py-0.5 disabled:opacity-30">{t("Next ›")}</button>
      </div>
    </div>
  );
}
