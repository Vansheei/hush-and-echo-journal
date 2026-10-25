import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveWritten } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

export const Route = createFileRoute("/write")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Diary — Write" },
    { name: "description", content: "Write a private diary entry." },
    { property: "og:title", content: "Diary — Write" },
    { property: "og:description", content: "Write a private, encrypted diary entry." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WritePage,
});

function WritePage() {
  const { key, bump } = useVault();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!key || !text.trim() || saving) return;
    setSaving(true);
    try {
      await saveWritten(key, text);
      bump();
      await nav({ to: "/" });
    } catch { setError("Could not save. Your words are still here; try again."); setSaving(false); }
  }
  return (
    <div className="app-shell">
      <AppHeader back title="Spill the tea" />
      <main className="relative z-[1] space-y-4 px-4 pb-20">
        <div className="writing-sheet">
          <Textarea aria-label="Written entry" autoFocus rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Just write…" className="journal-page writing-script min-h-80 w-full border-0 bg-transparent shadow-none focus-visible:ring-0" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={!text.trim() || saving} onClick={save}>{saving ? "Saving…" : "Save entry"}</Button>
      </main>
      <div className="burnt-reveal" aria-hidden />
    </div>
  );
}
