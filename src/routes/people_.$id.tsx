import { t, useLanguage, format } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader, fmtDuration } from "@/components/diary/AppHeader";
import { useVault } from "@/lib/vault-context";
import { listEntries, type Entry } from "@/lib/storage/db";
import { getPersonal, type Person } from "@/lib/storage/personal";

export const Route = createFileRoute("/people_/$id")({ ssr: false, head: () => ({ meta: [
  { title: "Diary — Person" }, { name: "description", content: "Entries and moments for a confirmed person." }, { property: "og:title", content: "Diary — Person" }, { property: "og:description", content: "Moments with a person you confirmed, found locally." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: PersonPage });

type Moment = { entry: Entry; start: number; text: string };

function PersonPage() {
  useLanguage();
  const { id } = Route.useParams();
  const { key, version } = useVault();
  const [person, setPerson] = useState<Person | null | undefined>(undefined);
  const [moments, setMoments] = useState<Moment[]>([]);
  useEffect(() => {
    let active = true;
    if (!key) return;
    (async () => {
      const personal = await getPersonal(key);
      const found = personal.people.find(p => p.id === id) ?? null;
      if (!found) { if (active) setPerson(null); return; }
      const names = [found.name, ...found.nicknames].map(n => n.toLowerCase()).filter(Boolean);
      const entries = await listEntries(key);
      const found_moments: Moment[] = [];
      for (const entry of entries) {
        if (entry.status !== "done") continue;
        for (const s of entry.segments) {
          const lower = s.text.toLowerCase();
          if (names.some(n => lower.includes(n))) found_moments.push({ entry, start: s.start, text: s.text });
        }
      }
      if (active) { setPerson(found); setMoments(found_moments); }
    })();
    return () => { active = false; };
  }, [key, id, version]);

  if (person === null) return <div className="screen-center text-paper">{t("Person not found.")}</div>;
  if (!person) return null;
  return (
    <div className="app-shell">
      <AppHeader back title={person.name} />
      <main className="space-y-4 px-4 pb-20">
        {person.nicknames.length > 0 && <p className="text-sm text-muted-foreground">{t("Also:")}{person.nicknames.join(", ")}</p>}
        <p className="text-sm text-muted-foreground">{t("Moments found on this phone by your confirmed names only — nothing is tagged automatically.")}</p>
        {!moments.length && <p className="text-sm text-muted-foreground">{t("No mentions found in finished transcripts yet.")}</p>}
        <ul className="space-y-3">
          {moments.map((m, i) => (
            <li key={i}>
              <Link to="/entry/$id" params={{ id: m.entry.id }} search={{ t: m.start }} className="block rounded-md border border-border/70 bg-card p-3">
                <span className="text-sm text-muted-foreground">{format(m.entry.createdAt, "d MMM yyyy, HH:mm")} · {fmtDuration(m.start)}</span>
                <p className="mt-1 line-clamp-2">{m.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
