import { createFileRoute } from "@tanstack/react-router";
import { LanguageSettings } from "@/components/diary/settings/LanguageSettings";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings_/language")({ ssr: false, head: () => settingsHead("language"), component: LanguageSectionPage });
function LanguageSectionPage() { return <SectionPage section="language"><LanguageSettings /></SectionPage>; }