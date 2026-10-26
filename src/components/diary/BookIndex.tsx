import { t, useLanguage } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";

export type IndexItem = { label: string; to?: string; onSelect?: () => void };

/** Plain-English gloss for each whimsical name, shown in the index and atop each section. */
export const SUBTITLES: Record<string, string> = {
  "Night Companion": "talk it through out loud",
  "Spill the tea": "write an entry by hand",
  "The Week’s Tale": "your week, as a scroll",
  "Unfinished Chapters": "things left hanging, to finish later",
  "Quiet Garden": "park a worry here until you’re ready",
  "Side Characters": "the people in your life",
  "Settings": "keys, locks, covers and voices",
  "Lexicon": "your own words and what they mean",
  "Unsent Letters": "drafts written to someone, never sent",
  "Archive": "search everything you’ve recorded",
  "Begin a Chapter": "record a new entry",
  "Inner Universe": "what the companion knows about you",
};

export const SECTIONS: IndexItem[] = [
  { label: "Night Companion", to: "/companion" },
  { label: "Spill the tea", to: "/write" },
  { label: "The Week’s Tale", to: "/recap" },
  { label: "Unfinished Chapters", to: "/loose-ends" },
  { label: "Quiet Garden", to: "/worry-parking" },
  { label: "Side Characters", to: "/people" },
  { label: "Settings", to: "/settings" },
  { label: "Lexicon", to: "/glossary" },
  { label: "Unsent Letters", to: "/drafts" },
  { label: "Archive", to: "/search" },
  { label: "Begin a Chapter", to: "/record" },
  { label: "Inner Universe", to: "/notebook" },
];

const sortKey = (s: string) => s.replace(/^The\s+/i, "").toLowerCase();

/** Page one: an alphabetical index in a 16th-century hand, plain ink, no colours. */
export function BookIndex({ items, days }: { items: IndexItem[]; days: { label: string; onSelect: () => void }[] }) {
  const language = useLanguage();
  const sorted = [...items].sort((a, b) => sortKey(t(a.label)).localeCompare(sortKey(t(b.label)), language));
  let letter = "";
  return (
    <div className="book-index">
      <h2 className="mb-3 text-center text-5xl">{t("Index")}</h2>
      <ul>
        {sorted.map((it) => {
          const l = (sortKey(t(it.label))[0] ?? "").toUpperCase();
          const head = l !== letter; letter = l;
          return (
            <li key={it.label}>
              {head && <span className="index-letter">{l}</span>}
              {it.to
                ? <Link to={it.to} className="index-row"><span>{t(it.label)}</span><span className="index-dots" /></Link>
                : <button type="button" onClick={it.onSelect} className="index-row w-full text-left"><span>{t(it.label)}</span><span className="index-dots" /></button>}
              {SUBTITLES[it.label] && <span className="index-note">{t(SUBTITLES[it.label] ?? "")}</span>}
            </li>
          );
        })}
      </ul>
      {days.length > 0 && <>
        <h3 className="mt-6 text-center text-4xl">{t("Chapters by day")}</h3>
        <ul>{days.map((d, i) => (
          <li key={d.label}><button type="button" onClick={d.onSelect} className="index-row w-full text-left"><span>{d.label}</span><span className="index-dots" /><span>{i + 2}</span></button></li>
        ))}</ul>
      </>}
    </div>
  );
}
