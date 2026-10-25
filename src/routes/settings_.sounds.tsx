import { createFileRoute } from "@tanstack/react-router";
import { SoundSettings } from "@/components/diary/settings/SoundSettings";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings_/sounds")({ ssr: false, head: () => settingsHead("sounds"), component: SettingsSectionPage });
function SettingsSectionPage() { return <SectionPage section="sounds"><SoundSettings /></SectionPage>; }
