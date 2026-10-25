import { useRef, useState, type ReactNode } from "react";
import { pageTurn } from "@/lib/sounds";

type Turn = { dir: 1 | -1; p: number; settling?: boolean; commit?: boolean };

/** Drag with a finger to turn pages forwards or backwards; same animation and sound both ways. */
export function TurnableBook({ pages, page, onPage }: { pages: ReactNode[]; page: number; onPage: (n: number) => void }) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; axis?: "x" | "y"; moved: boolean } | null>(null);

  const finish = (t: Turn) => {
    const commit = t.p > 0.3;
    pageTurn();
    setTurn({ ...t, p: commit ? 1 : 0, settling: true, commit });
  };

  const onDown = (e: React.PointerEvent) => { if (!turn?.settling) start.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.axis) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; }
    if (s.axis !== "x") return;
    s.moved = true;
    const dir: 1 | -1 = dx < 0 ? 1 : -1;
    if ((dir === 1 && page >= pages.length - 1) || (dir === -1 && page <= 0)) { setTurn(null); return; }
    const w = ref.current?.offsetWidth ?? 360;
    setTurn({ dir, p: Math.min(1, Math.abs(dx) / w) });
  };
  const onUp = () => { const s = start.current; start.current = null; if (s?.moved && turn && !turn.settling) finish(turn); };

  const done = () => {
    if (!turn?.settling) return;
    if (turn.commit) onPage(page + turn.dir);
    setTurn(null);
  };

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
        <div className="turn-sheet" onTransitionEnd={done}
          style={{ transform: `rotateY(${angle}deg)`, transition: turn.settling ? "transform 0.55s cubic-bezier(.4,.1,.3,1)" : "none" }}>
          <div className="turn-face">{sheet}</div>
          <div className="turn-shade" style={{ opacity: Math.sin((-angle / 180) * Math.PI) * 0.5 }} />
        </div>
      )}
      <p className="mt-3 text-center text-sm text-muted-foreground">Page {page + 1} of {pages.length} · drag to turn</p>
    </div>
  );
}
