import { Link } from "@tanstack/react-router";
import { BookHeart, CalendarDays, CloudRain, Feather, ListTodo, Mail, Mic, Search, Sparkles, Users } from "lucide-react";

/** The featured Companion spot: a little moonlit window into the cover. */
export function CompanionCard() {
  return (
    <Link to="/companion" className="companion-card relative mx-4 mb-5 block overflow-hidden rounded-[1.6rem_1.6rem_0.6rem_0.6rem] p-5 pt-6 text-gold transition-transform active:scale-[0.99]">
      <svg viewBox="0 0 320 140" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="cc-ray" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="var(--gold-bright)" stopOpacity="0.25" /><stop offset="1" stopColor="var(--gold-bright)" stopOpacity="0" /></linearGradient>
          <mask id="cc-cres"><rect width="320" height="140" fill="white" /><circle cx="282" cy="30" r="13" fill="black" /></mask>
        </defs>
        <polygon points="150,0 172,0 250,140 205,140" fill="url(#cc-ray)" className="cover-rays" />
        <polygon points="200,0 210,0 290,120 270,140" fill="url(#cc-ray)" className="cover-rays" />
        <circle cx="274" cy="36" r="15" fill="var(--moon)" mask="url(#cc-cres)" />
        {[[40, 22], [120, 14], [190, 40], [240, 18], [300, 70], [90, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.9" fill="var(--gold)" />)}
        <path d="M228 112 C 233 114, 248 114, 252 109 C 249 108, 246 104, 247 99 C 248 96, 251 96, 252 98 L 254 98 L 252 99 C 250 103, 252 106, 255 107 C 258 102, 264 104, 262 110 C 256 116, 232 116, 228 112 Z" fill="var(--moon)" opacity="0.9" />
        <path d="M200 120 q10 -3 20 0 q10 3 20 0 q10 -3 20 0 q10 3 20 0" stroke="var(--gold)" strokeWidth="0.6" fill="none" opacity="0.5" />
      </svg>
      <div className="relative flex items-center gap-4">
        <span className="companion-orb flex size-14 shrink-0 items-center justify-center rounded-full border border-gold"><Mic className="size-6" /></span>
        <span>
          <span className="block font-display text-4xl leading-tight text-gold-bright">Talk to me</span>
          <span className="block text-sm text-gold/80">Companion · tap once and just talk</span>
        </span>
      </div>
    </Link>
  );
}

const TABS = [
  { to: "/write", label: "Write", Icon: Feather, tone: "tab-a" },
  { to: "/recap", label: "Weekly recap", Icon: CalendarDays, tone: "tab-b" },
  { to: "/loose-ends", label: "Loose ends", Icon: ListTodo, tone: "tab-c" },
  { to: "/worry-parking", label: "Worry parking", Icon: CloudRain, tone: "tab-d" },
  { to: "/people", label: "People", Icon: Users, tone: "tab-b" },
  { to: "/glossary", label: "Glossary", Icon: BookHeart, tone: "tab-a" },
  { to: "/search", label: "Search", Icon: Search, tone: "tab-d" },
  { to: "/notebook", label: "What I know about you", Icon: Sparkles, tone: "tab-c" },
  { to: "/drafts", label: "Drafts", Icon: Mail, tone: "tab-a" },
] as const;

/** Silk ribbon bookmarks: two columns on a phone, three on wider screens. */
export function RibbonTabs() {
  return (
    <nav aria-label="Sections" className="relative z-[1] grid grid-cols-2 gap-x-3 gap-y-2.5 px-4 pb-5 sm:grid-cols-3">
      {TABS.map(({ to, label, Icon, tone }) => (
        <Link key={to} to={to} className={`ribbon-tab ${tone}`}>
          <Icon className="size-4 shrink-0 text-gold-bright" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
