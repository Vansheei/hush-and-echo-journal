import { t, useLanguage } from "@/lib/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/lib/vault-context";
import { updatePersonal, type Suggestions } from "@/lib/storage/personal";

export function Clarifications({ suggestions }: { suggestions?: Suggestions | undefined }) {
  useLanguage();
  if (!suggestions) return null;
  return <div className="space-y-4">
    {suggestions.meanings.map((item, i) => <ConfirmMeaning key={`word-${i}`} {...item} />)}
    {suggestions.people.map((item, i) => <ConfirmPerson key={`person-${i}`} {...item} />)}
    {(suggestions.notes ?? []).map((item, i) => <ConfirmNote key={`note-${i}`} {...item} />)}
  </div>;
}
function ConfirmMeaning({ phrase, meaning, language }: Suggestions["meanings"][number]) {
  useLanguage();
  const { key, bump } = useVault(); const [value, setValue] = useState(meaning); const [done, setDone] = useState(false); const [error, setError] = useState("");
  if (done) return null;
  return <div className="space-y-2 border-l-2 border-gold pl-3"><p>Does “{phrase}” mean this in {language}?</p><Input aria-label={`Meaning of ${phrase}`} value={value} onChange={e => setValue(e.target.value)} /><div className="flex gap-2"><Button size="sm" disabled={!value.trim()} onClick={async () => { if (!key) return; try { await updatePersonal(key, d => ({ ...d, glossary: [...d.glossary.filter(w => w.phrase !== phrase), { id: crypto.randomUUID(), phrase, meaning: value.trim(), language }] })); setDone(true); bump(); } catch { setError("Could not save meaning."); } }}>{t("Confirm meaning")}</Button><Button size="sm" variant="ghost" onClick={() => setDone(true)}>{t("Dismiss")}</Button></div>{error && <p role="alert">{t(error)}</p>}</div>;
}
function ConfirmPerson({ mention, question }: Suggestions["people"][number]) {
  useLanguage();
  const { key, bump } = useVault(); const [name, setName] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState("");
  if (done) return null;
  return <div className="space-y-2 border-l-2 border-gold pl-3"><p>{question}</p><Input aria-label={`Who is ${mention}?`} placeholder={t("Who do you mean?")} value={name} onChange={e => setName(e.target.value)} /><div className="flex gap-2"><Button size="sm" disabled={!name.trim()} onClick={async () => { if (!key) return; try { await updatePersonal(key, d => { const match = d.people.find(p => p.name.toLowerCase() === name.trim().toLowerCase()); return { ...d, people: match ? d.people.map(p => p.id === match.id ? { ...p, nicknames: Array.from(new Set([...p.nicknames, mention])) } : p) : [...d.people, { id: crypto.randomUUID(), name: name.trim(), nicknames: [mention] }] }; }); setDone(true); bump(); } catch { setError("Could not remember this person."); } }}>{t("Confirm person")}</Button><Button size="sm" variant="ghost" onClick={() => setDone(true)}>{t("Dismiss")}</Button></div>{error && <p role="alert">{t(error)}</p>}</div>;
}
function ConfirmNote({ kind, text }: Suggestions["notes"][number]) {
  useLanguage();
  const { key, bump } = useVault(); const [value, setValue] = useState(text); const [noteKind, setNoteKind] = useState<"fact" | "interpretation">(kind); const [done, setDone] = useState(false); const [error, setError] = useState("");
  if (done) return null;
  return <div className="space-y-2 border-l-2 border-gold pl-3">
    <p className="text-sm text-muted-foreground">{t("Your companion thinks it learned this about you:")}</p>
    <Input aria-label={t("Suggested note")} value={value} onChange={e => setValue(e.target.value)} />
    <div className="flex gap-2">{(["fact", "interpretation"] as const).map(k => <Button key={k} size="sm" variant={noteKind === k ? "default" : "outline"} onClick={() => setNoteKind(k)}>{k === "fact" ? t("Fact") : t("Interpretation")}</Button>)}</div>
    <div className="flex gap-2"><Button size="sm" disabled={!value.trim()} onClick={async () => { if (!key) return; try { await updatePersonal(key, d => ({ ...d, notebook: [...d.notebook, { id: crypto.randomUUID(), kind: noteKind, text: value.trim(), createdAt: Date.now() }] })); setDone(true); bump(); } catch { setError("Could not save note."); } }}>{t("Accept note")}</Button><Button size="sm" variant="ghost" onClick={() => setDone(true)}>{t("Dismiss")}</Button></div>
    {error && <p role="alert">{t(error)}</p>}
  </div>;
}
