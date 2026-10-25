import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/diary/AppHeader";
import { EntryToken } from "@/components/diary/EntryToken";
import { PeopleTabs, SAMPLE_PEOPLE } from "@/components/diary/PeopleTabs";

export const Route = createFileRoute("/people")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diary — People" },
      { name: "description", content: "Sections of the diary for the people in your life." },
      { property: "og:title", content: "Diary — People" },
      { property: "og:description", content: "Sections of the diary for the people in your life." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const [active, setActive] = useState(SAMPLE_PEOPLE[0]!.id);
  const person = SAMPLE_PEOPLE.find((p) => p.id === active)!;
  return (
    <div className="app-shell">
      <AppHeader back title="People" />
      <PeopleTabs people={SAMPLE_PEOPLE} active={active} onSelect={setActive} />
      <main className="space-y-4 px-4 pb-20 pr-10">
        <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          Preview with sample people. Real people and their entries arrive in the people phase.
        </p>
        <header className="flex items-center gap-3 border-b border-border pb-2">
          <span className={`size-3 rounded-full ${person.color}`} />
          <h2 className="font-display text-4xl">{person.name}</h2>
        </header>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-md bg-card p-3 opacity-70">
            <EntryToken kind={i === 1 ? "audio" : "video"} id={person.id + i} />
            <div className="space-y-1.5"><div className="h-2.5 w-40 rounded bg-muted" /><div className="h-2.5 w-24 rounded bg-muted" /></div>
          </div>
        ))}
      </main>
    </div>
  );
}
