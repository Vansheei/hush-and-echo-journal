import { t, useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/diary/AppHeader";
import { SETTINGS_SECTIONS, settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings")({ ssr: false, head: () => settingsHead(), component: SettingsPage });
function SettingsPage() {
  useLanguage();
  return <div className="app-shell settings-pages"><AppHeader back title={t("Settings")} /><main className="px-6 pb-16"><nav aria-label={t("Settings sections")} className="divide-y divide-border">{SETTINGS_SECTIONS.map(section => <Link key={section.id} to={section.to} className="flex min-h-16 items-center justify-between gap-3 py-4 text-foreground"><span className="font-display text-3xl">{t(section.name)}</span><ChevronRight className="size-4 shrink-0" aria-hidden /></Link>)}</nav></main></div>;
}
