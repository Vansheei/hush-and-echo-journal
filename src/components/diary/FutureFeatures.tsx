import { BookUser, PhoneIncoming, MessageSquare, AudioLines, CloudSun, Laptop } from "lucide-react";

const features = [
  { icon: BookUser, name: "Android contacts access", detail: "Choose contacts on your Android device." },
  { icon: PhoneIncoming, name: "Call detection for flagged contacts", detail: "Their unfinished chapters when they call." },
  { icon: MessageSquare, name: "Notification listener", detail: "SMS, WhatsApp and Gmail from flagged contacts." },
  { icon: AudioLines, name: "On-device speech emotion model", detail: "A local emotion model to replace the current voice-cue measurements." },
  { icon: CloudSun, name: "Seasonal date and weather theme", detail: "Weather-aware seasons. Date-based seasonal artwork is already available." },
  { icon: Laptop, name: "Laptop sync", detail: "Encrypted diary access across your devices." },
];

export function FutureFeatures() {
  return <section className="settings-card">
    <h2>Coming later</h2>
    <ul className="divide-y divide-border">{features.map(({ icon: Icon, name, detail }) => <li key={name} className="flex gap-3 py-3">
      <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0"><h3 className="text-base">{name}</h3><span className="text-xs text-muted-foreground">Coming later</span><p className="text-sm text-muted-foreground">{detail}</p></div>
    </li>)}</ul>
  </section>;
}