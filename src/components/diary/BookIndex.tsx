import { Link } from "@tanstack/react-router";

export type IndexItem = { label: string; to?: string; onSelect?: () => void };

export const SECTIONS: IndexItem[] = [
  { label: "Night Companion", to: "/companion" },
  { label: "Spill the tea", to: "/write" },
  { label: "The Week’s Tale", to: "/recap" },
  { label: "Unfinished Chapters", to: "/loose-ends" },
  { label: "Quiet Garden", to: "/worry-parking" },
  { label: "Side Characters", to: "/people" },
  { label: "Lexicon", to: "/glossary" },
  { label: "Unsent Letters", to: "/drafts" },
  { label: "Archive", to: "/search" },
  { label: "Begin a Chapter", to: "/record" },
  { label: "Inner Universe", to: "/notebook" },
];

const sortKey = (s: string) => s.replace(/^The\s+/i, "").toLowerCase();

/** Page one: an alphabetical index in a 16th-century hand, plain ink, no colours. */
export function BookIndex({ items, days }: { items: IndexItem[]; days: { label: string; onSelect: () => void }[] }) {
  const sorted = [...items].sort((a, b) => sortKey(a.label).localeCompare(sortKey(b.label)));
  let letter = "";
  return (
    <div className="book-index">
      <h2 className="mb-3 text-center text-5xl">Index</h2>
      <ul>
        {sorted.map((it) => {
          const l = sortKey(it.label)[0]!.toUpperCase();
          const head = l !== letter; letter = l;
          return (
            <li key={it.label}>
              {head && <span className="index-letter">{l}</span>}
              {it.to
                ? <Link to={it.to} className="index-row"><span>{it.label}</span><span className="index-dots" /></Link>
                : <button type="button" onClick={it.onSelect} className="index-row w-full text-left"><span>{it.label}</span><span className="index-dots" /></button>}
            </li>
          );
        })}
      </ul>
      {days.length > 0 && <>
        <h3 className="mt-6 text-center text-4xl">Chapters by day</h3>
        <ul>{days.map((d, i) => (
          <li key={d.label}><button type="button" onClick={d.onSelect} className="index-row w-full text-left"><span>{d.label}</span><span className="index-dots" /><span>{i + 2}</span></button></li>
        ))}</ul>
      </>}
    </div>
  );
}
