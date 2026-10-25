import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Volume2, ThumbsUp, ThumbsDown } from "lucide-react";
import { AppHeader } from "@/components/diary/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clarifications } from "@/components/diary/Clarifications";
import { useVault } from "@/lib/vault-context";
import { getApiKey, listEntries } from "@/lib/storage/db";
import { contextText, getPersonal, updatePersonal, type ChatMessage } from "@/lib/storage/personal";
import { requestReflection } from "@/lib/ai/anthropic";
import { transcribe } from "@/lib/transcription";
export const Route = createFileRoute("/companion")({ ssr: false, head: () => ({ meta: [
  { title: "Diary — Companion" }, { name: "description", content: "Your private voice and text diary companion." }, { property: "og:title", content: "Diary — Companion" }, { property: "og:description", content: "An explicitly requested conversation with your diary companion." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: CompanionPage });
function CompanionPage() {
  const { key, settings, version, bump, setBusy: setVaultBusy } = useVault();
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [draft, setDraft] = useState(""); const [approach, setApproach] = useState("Combined"); const [speak, setSpeak] = useState(true); const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]); const [voice, setVoice] = useState(""); const [recording, setRecording] = useState(false); const [busy, setBusy] = useState(false); const [status, setStatus] = useState(""); const [confirm, setConfirm] = useState(false); const [includeEntries, setIncludeEntries] = useState(false); const [preview, setPreview] = useState(""); const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const alive = useRef(true); const recorder = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null); const hold = useRef(false); const controller = useRef<AbortController | null>(null); const phase = useRef(false);
  useEffect(() => { alive.current = true; if ("speechSynthesis" in window) { const load = () => setVoices(window.speechSynthesis.getVoices().filter(v => v.localService)); load(); window.speechSynthesis.addEventListener("voiceschanged", load); return () => { alive.current = false; controller.current?.abort(); hold.current = false; recorder.current?.stop(); stream.current?.getTracks().forEach(t => t.stop()); window.speechSynthesis.cancel(); window.speechSynthesis.removeEventListener("voiceschanged", load); }; } return () => { alive.current = false; controller.current?.abort(); stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { let active = true; if (key) getPersonal(key).then(d => { if (active) setMessages(d.chat); }); return () => { active = false; }; }, [key, version]);
  useEffect(() => { return () => setVaultBusy(false); }, [setVaultBusy]);
  function read(text: string) {
    if (!("speechSynthesis" in window)) { setStatus("This phone has no built-in speech voice."); return; }
    const selected = voices.find(v => v.voiceURI === voice) ?? voices[0];
    if (!selected) { setStatus("No on-device voice is installed. Text replies remain available."); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.voice = selected; utterance.lang = selected.lang; window.speechSynthesis.speak(utterance);
  }
  async function startHold() {
    if (phase.current || busy) return; hold.current = true; phase.current = true; setVaultBusy(true); setStatus("");
    try {
      const source = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!hold.current || !alive.current) { source.getTracks().forEach(t => t.stop()); phase.current = false; setVaultBusy(false); return; }
      stream.current = source; const rec = new MediaRecorder(source); recorder.current = rec; const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => { source.getTracks().forEach(t => t.stop()); phase.current = false; setVaultBusy(false); if (alive.current) { setRecording(false); setStatus("Recording failed. Your text draft is unchanged."); } };
      rec.onstop = async () => {
        source.getTracks().forEach(t => t.stop()); stream.current = null; recorder.current = null; if (alive.current) { setRecording(false); setBusy(true); setStatus("Transcribing on this phone…"); }
        try { const segments = await transcribe(new Blob(chunks, { type: rec.mimeType }), settings.whisperModel, p => { if (alive.current) setStatus(`${p.phase === "download" ? "Preparing local speech model" : "Transcribing"} ${Math.round(p.pct)}%…`); });
          if (alive.current) { const text = segments.map(s => s.text).join(" "); setDraft(d => [d, text].filter(Boolean).join(" ")); setStatus(text ? "" : "No speech detected."); }
        } catch (e) { if (alive.current) setStatus(e instanceof Error ? e.message : "Transcription failed."); }
        finally { chunks.length = 0; phase.current = false; if (alive.current) setBusy(false); setVaultBusy(false); }
      };
      rec.start(); setRecording(true);
    } catch (e) { phase.current = false; setVaultBusy(false); if (alive.current) setStatus(e instanceof Error ? e.message : "Microphone unavailable."); }
  }
  function stopHold() { hold.current = false; if (recorder.current?.state === "recording") recorder.current.stop(); }
  async function previewSend() {
    if (!key || !draft.trim() || busy) return;
    try {
      const personal = await getPersonal(key); const entries = includeEntries ? await listEntries(key) : [];
      const context = contextText(personal) + `\nOwner notebook (facts and interpretations remain distinct):\n${JSON.stringify(personal.notebook)}` + (includeEntries ? `\nDiary transcripts selected for this request:\n${entries.filter(e => e.status === "done").map(e => `${new Date(e.createdAt).toISOString()}\n${e.segments.map(s => s.text).join(" ")}`).join("\n\n")}` : "");
      if (!alive.current) return; setHistory(personal.chat.map(m => ({ role: m.role, content: m.text }))); setPreview(context); setConfirm(true); setStatus("");
    } catch { setStatus("Could not prepare conversation."); }
  }
  async function send() {
    if (!key || busy) return; setBusy(true); setStatus(""); const abort = new AbortController(); controller.current = abort;
    try {
      const apiKey = await getApiKey(key); if (!apiKey) throw new Error("Save your Anthropic key in Settings first.");
      const response = await requestReflection({ confirmed: true, mode: "reflect", apiKey, text: draft.trim(), context: preview, conversation: history, approach, model: settings.models.companion, signal: abort.signal });
      if (!alive.current || abort.signal.aborted) return;
      const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text: draft.trim() }; const assistant: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: response.text, suggestions: response.suggestions };
      await updatePersonal(key, d => ({ ...d, chat: [...d.chat, user, assistant] }));
      if (!alive.current) return; setDraft(""); setConfirm(false); bump(); if (speak) read(response.text);
    } catch (e) { if (alive.current) setStatus(e instanceof Error ? e.message : "Conversation failed."); }
    finally { controller.current = null; if (alive.current) setBusy(false); }
  }
  return <div className="app-shell"><AppHeader back title="Companion" /><main className="space-y-5 px-4 pb-20"><div className="flex flex-wrap gap-2">{["CBT", "Interpersonal", "Combined"].map(v => <Button size="sm" key={v} variant={approach === v ? "default" : "outline"} onClick={() => setApproach(v)} disabled={busy}>{v}</Button>)}</div>
    <label className="flex items-center justify-between gap-3">Read replies aloud<Switch checked={speak} onCheckedChange={v => { setSpeak(v); if (!v && "speechSynthesis" in window) window.speechSynthesis.cancel(); }} /></label>
    {voices.length > 0 && <Select value={voice || voices[0]?.voiceURI || ""} onValueChange={setVoice}><SelectTrigger aria-label="On-device voice"><SelectValue /></SelectTrigger><SelectContent>{voices.map(v => <SelectItem key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</SelectItem>)}</SelectContent></Select>}
    <div className="space-y-5">{messages.map(m => <article key={m.id} className={`space-y-2 border-l-2 pl-3 ${m.role === "user" ? "border-ribbon" : "border-gold"}`}><h2 className="font-display text-2xl">{m.role === "user" ? "You" : "Companion"}</h2><p className="whitespace-pre-wrap break-words">{m.text}</p>{m.role === "assistant" && <><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Read reply" title="Read reply" onClick={() => read(m.text)}><Volume2 /></Button>{(["helpful", "unhelpful"] as const).map(f => <Button key={f} size="icon" variant={m.feedback === f ? "secondary" : "ghost"} aria-label={f === "helpful" ? "Helpful reply" : "Unhelpful reply"} aria-pressed={m.feedback === f} title={f} onClick={async () => { if (!key) return; try { await updatePersonal(key, d => ({ ...d, chat: d.chat.map(x => x.id === m.id ? { ...x, feedback: f } : x) })); bump(); } catch { setStatus("Could not save feedback."); } }}>{f === "helpful" ? <ThumbsUp /> : <ThumbsDown />}</Button>)}</div><Clarifications suggestions={m.suggestions} /></>}</article>)}</div>
    <Textarea aria-label="Message to companion" value={draft} onChange={e => setDraft(e.target.value)} disabled={busy || recording} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeEntries} disabled={busy} onChange={e => setIncludeEntries(e.target.checked)} />Include diary transcripts for this request</label>
    <div className="flex flex-wrap gap-2"><Button className="touch-none select-none" variant={recording ? "destructive" : "outline"} aria-label="Hold to talk" disabled={busy} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); void startHold(); }} onPointerUp={stopHold} onPointerCancel={stopHold} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); void startHold(); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stopHold(); } }}><Mic />{recording ? "Listening…" : "Hold to talk"}</Button><Button disabled={busy || recording || !draft.trim()} aria-label="Prepare message" onClick={previewSend}><Send />Send</Button><Button size="icon" variant="ghost" aria-label="Stop speaking" title="Stop speaking" onClick={() => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }}><Square /></Button></div>
    {status && <p role="status" className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{status}</p>}<Select disabled><SelectTrigger aria-label="Future cloud voice"><SelectValue placeholder="Natural cloud voice · later" /></SelectTrigger><SelectContent /></Select>
    {messages.length > 0 && <Button variant="ghost" onClick={async () => { if (!key || !window.confirm("Delete this conversation?")) return; try { await updatePersonal(key, d => ({ ...d, chat: [] })); bump(); } catch { setStatus("Could not delete conversation."); } }}>Clear conversation</Button>}
  </main><Dialog open={confirm} onOpenChange={v => { if (!v) controller.current?.abort(); setConfirm(v); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Send this conversation to Claude?</DialogTitle><DialogDescription>Text only: your message, past conversation, notebook, confirmed words and people, plus selected transcripts. No recording is sent.</DialogDescription></DialogHeader><pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words bg-muted p-3 text-sm">{preview}{"\n\n"}{history.map(m => `${m.role}: ${m.content}`).join("\n")}{"\n\nYou: "}{draft}</pre>{status && <p role="alert">{status}</p>}<div className="flex gap-2"><Button disabled={busy} onClick={send}>{busy ? "Waiting for Claude…" : "Confirm and send"}</Button><Button variant="outline" onClick={() => { controller.current?.abort(); setConfirm(false); }}>Cancel</Button></div></DialogContent></Dialog></div>;
}