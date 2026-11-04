import { t, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil, Trash2, Check, Archive, RotateCcw } from "lucide-react";
import { AppHeader } from "./AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteItem, listItems, putItem, type DiaryItem } from "@/lib/storage/db";
import { useVault } from "@/lib/vault-context";

export function ItemsPage({ kind }: { kind: DiaryItem["kind"] }) {
  useLanguage();
  const { key } = useVault();
  const [items, setItems] = useState<DiaryItem[]>([]);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<DiaryItem | null>(null);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    if (key) listItems(key).then((rows) => { if (active) setItems(rows.filter((r) => r.kind === kind).sort((a, b) => b.createdAt - a.createdAt)); });
    return () => { active = false; };
  }, [key, kind, version]);
  async function write(item: DiaryItem) {
    if (!key) return;
    try { await putItem(key, item); setVersion((v) => v + 1); setError(""); }
    catch { setError("Could not save. Please try again."); }
  }
  return <div className="app-shell">
    <AppHeader back title={kind === "loose" ? t("Unfinished Chapters") : t("Quiet Garden")} />
    <main className="space-y-6 px-4 pb-20">
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault(); if (!text.trim()) return;
        await write(editing ? { ...editing, text: text.trim() } : { id: crypto.randomUUID(), kind, text: text.trim(), closed: false, createdAt: Date.now() });
        setText(""); setEditing(null);
      }}>
        <Input aria-label={kind === "loose" ? t("Loose end") : t("Worry")} placeholder={kind === "loose" ? t("An unfinished thought or task") : t("What is on your mind?")} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" disabled={!text.trim()}>{editing ? t("Save") : t("Add")}</Button>
        {editing && <Button variant="ghost" type="button" onClick={() => { setEditing(null); setText(""); }}>{t("Cancel")}</Button>}
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
      <div className="flex gap-2">
        <Button variant={!closed ? "default" : "outline"} onClick={() => setClosed(false)}>{t("Open")}</Button>
        <Button variant={closed ? "default" : "outline"} onClick={() => setClosed(true)}>{kind === "loose" ? t("Resolved") : t("Archived")}</Button>
      </div>
      <ul className="divide-y divide-border">
        {items.filter((i) => i.closed === closed).map((item) => <li key={item.id} className="space-y-2 py-4">
          <p className="break-words">{item.text}</p>
          {item.entryId && <Link to="/entry/$id" params={{ id: item.entryId }} className="text-sm text-primary">{t("Source entry")}</Link>}
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" aria-label={t("Edit item")} title={t("Edit")} onClick={() => { setEditing(item); setText(item.text); }}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label={closed ? t("Reopen item") : kind === "loose" ? t("Resolve item") : t("Archive item")} title={closed ? t("Reopen") : kind === "loose" ? t("Resolve") : t("Archive")} onClick={() => write({ ...item, closed: !item.closed })}>{closed ? <RotateCcw /> : kind === "loose" ? <Check /> : <Archive />}</Button>
            <Button size="icon" variant="ghost" aria-label={t("Delete item")} title={t("Delete")} onClick={async () => { if (window.confirm(t("Delete this item?"))) { await deleteItem(item.id); setVersion((v) => v + 1); } }}><Trash2 /></Button>
          </div>
        </li>)}
      </ul>
      {!items.some((i) => i.closed === closed) && <p className="text-sm text-muted-foreground">{t("No {items}.", { items: t(closed ? kind === "loose" ? "resolved items" : "archived worries" : kind === "loose" ? "loose ends" : "parked worries") })}</p>}
    </main>
  </div>;
}