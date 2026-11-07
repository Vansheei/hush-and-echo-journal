import { t, useLanguage } from "@/lib/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getEntry, putEntry, type Entry } from "@/lib/storage/db";
import { applySegmentEdits } from "@/lib/transcript-edit";
import { useVault } from "@/lib/vault-context";

/** Edit the whole transcript in place; saved encrypted, and reflections read the corrected words. */
export function TranscriptEditor({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  useLanguage();
  const { key, bump } = useVault();
  const original = entry.segments.map((s) => s.text);
  const [texts, setTexts] = useState(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const written = entry.kind === "written";

  async function save() {
    if (!key || saving) return;
    setSaving(true);
    setError("");
    try {
      const latest = await getEntry(key, entry.id);
      if (!latest) throw new Error("Entry not found.");
      if (latest.segments.map((s) => s.text).join("\u0000") !== original.join("\u0000")) {
        throw new Error("Transcript changed while editing. Close and try again.");
      }
      await putEntry(key, { ...latest, segments: applySegmentEdits(latest.segments, texts) });
      bump();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("Change any words, then save. Times stay as they were.")}</p>
      <div className="space-y-2">
        {texts.map((text, i) => (
          <Textarea
            key={i}
            aria-label={t("Transcript part {n}", { n: i + 1 })}
            value={text}
            rows={written ? 12 : Math.min(6, Math.max(2, Math.ceil(text.length / 40)))}
            onChange={(e) => setTexts((all) => all.map((v, j) => (j === i ? e.target.value : v)))}
            className="journal-page min-h-0 w-full"
          />
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</Button>
        <Button variant="ghost" onClick={onDone} disabled={saving}>{t("Cancel")}</Button>
      </div>
    </div>
  );
}
