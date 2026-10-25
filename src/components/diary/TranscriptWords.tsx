import { t, useLanguage } from "@/lib/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getEntry, putEntry, type Entry } from "@/lib/storage/db";
import { updatePersonal } from "@/lib/storage/personal";
import { useVault } from "@/lib/vault-context";
import { isFlagged } from "@/lib/flagged";
export function TranscriptWords({ entry, segment }: { entry: Entry; segment: number }) {
  useLanguage();
  const { key, bump } = useVault(); const [word, setWord] = useState<number | null>(null); const [text, setText] = useState(""); const [phrase, setPhrase] = useState(""); const [meaning, setMeaning] = useState(""); const [language, setLanguage] = useState(""); const [error, setError] = useState("");
  const tokens = (entry.segments[segment]?.text ?? "").split(/(\s+)/u);
  async function save() { if (!key || word === null || !text.trim()) return; try {
    const latest = await getEntry(key, entry.id); if (!latest) return;
    const current = latest.segments[segment]; if (!current) return;
    if (current.text !== entry.segments[segment]?.text) throw new Error("Transcript changed. Close and tap the word again.");
    const parts = current.text.split(/(\s+)/u); parts[word] = text.trim();
    await putEntry(key, { ...latest, segments: latest.segments.map((s, i) => i === segment ? { ...s, text: parts.join("") } : s) });
    if (meaning.trim() && phrase.trim()) await updatePersonal(key, d => ({ ...d, glossary: [...d.glossary.filter(g => g.phrase !== phrase.trim()), { id: crypto.randomUUID(), phrase: phrase.trim(), meaning: meaning.trim(), language: language.trim() }] }));
    setWord(null); bump();
  } catch (e) { setError(e instanceof Error ? e.message : "Could not save correction."); } }
  return <><span>{tokens.map((token, i) => /^\s+$/u.test(token) ? token : <span key={i} className="inline"><Button variant="ghost" className="inline h-auto whitespace-normal rounded-none p-0 font-normal text-inherit hover:underline" onClick={() => { setWord(i); setText(token); setPhrase(token); setMeaning(""); setLanguage(""); setError(""); }}>{token}</Button>{isFlagged(entry.flagged, token) && <button aria-label={t("Claude was unsure about “{token}”. Tap to correct it or add its meaning.", { token })} title={t("Claude was unsure about this word")} className="ml-0.5 align-super text-xs font-bold text-destructive" onClick={() => { setWord(i); setText(token); setPhrase(token); setMeaning(""); setLanguage(""); setError(""); }}>!</button>}</span>)}</span>
  <Dialog open={word !== null} onOpenChange={v => { if (!v) setWord(null); }}><DialogContent><DialogHeader><DialogTitle>{t("Correct this word")}</DialogTitle><DialogDescription>{t("Saved only in your encrypted diary.")}</DialogDescription></DialogHeader><Input aria-label={t("Corrected word")} value={text} onChange={e => setText(e.target.value)} /><Input aria-label={t("Glossary phrase")} placeholder={t("Word or phrase for glossary (optional)")} value={phrase} onChange={e => setPhrase(e.target.value)} /><Input aria-label={t("Meaning")} placeholder={t("Meaning (optional)")} value={meaning} onChange={e => setMeaning(e.target.value)} /><Input aria-label={t("Language")} placeholder={t("Language (optional)")} value={language} onChange={e => setLanguage(e.target.value)} />{error && <p role="alert">{t(error)}</p>}<Button onClick={save}>{t("Save correction")}</Button></DialogContent></Dialog></>;
}