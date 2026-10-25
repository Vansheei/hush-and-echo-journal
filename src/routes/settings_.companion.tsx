import { createFileRoute } from "@tanstack/react-router";
import { CompanionSettings } from "@/components/diary/settings/CompanionSettings";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings_/companion")({ ssr: false, head: () => settingsHead("companion"), component: SettingsSectionPage });
function SettingsSectionPage() { return <SectionPage section="companion"><CompanionSettings /></SectionPage>; }
