import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/lib/vault-context";
import { getPersonal, updatePersonal, type Person } from "@/lib/storage/personal";

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
  const { key, version, bump } = useVault();
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState(""); const [nicknames, setNicknames] = useState(""); const [edit, setEdit] = useState<string | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; if (key) getPersonal(key).then(d => { if (active) setPeople(d.people); }); return () => { active = false; }; }, [key, version]);
  return (
    <div className="app-shell">
      <AppHeader back title="People" />
      <main className="space-y-4 px-4 pb-20">
        <Input aria-label="Person name" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <Input aria-label="Nicknames" placeholder="Nicknames, separated by commas" value={nicknames} onChange={e => setNicknames(e.target.value)} />
        <div className="flex gap-2"><Button disabled={!name.trim()} onClick={async () => { if (!key) return; try { const person = { id: edit ?? crypto.randomUUID(), name: name.trim(), nicknames: nicknames.split(",").map(s => s.trim()).filter(Boolean) }; await updatePersonal(key, d => ({ ...d, people: [...d.people.filter(p => p.id !== edit), person] })); setName(""); setNicknames(""); setEdit(null); bump(); } catch { setError("Could not save person."); } }}>{edit ? "Save person" : "Confirm new person"}</Button>{edit && <Button variant="ghost" onClick={() => { setEdit(null); setName(""); setNicknames(""); }}>Cancel</Button>}</div>
        {error && <p role="alert">{error}</p>}
        {people.map(person => <section key={person.id} className="space-y-2 border-t border-border pt-3"><h2 className="font-display text-3xl">{person.name}</h2><p className="break-words">{person.nicknames.join(", ")}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEdit(person.id); setName(person.name); setNicknames(person.nicknames.join(", ")); }}>Edit</Button><Button size="sm" variant="ghost" onClick={async () => { if (!key || !window.confirm("Forget this person?")) return; try { await updatePersonal(key, d => ({ ...d, people: d.people.filter(p => p.id !== person.id) })); bump(); } catch { setError("Could not forget person."); } }}>Forget</Button></div></section>)}
      </main>
    </div>
  );
}
