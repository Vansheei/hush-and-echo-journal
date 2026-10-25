import { createFileRoute } from "@tanstack/react-router";
import { CoverSettings } from "@/components/diary/settings/CoverSettings";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings_/cover")({ ssr: false, head: () => settingsHead("cover"), component: SettingsSectionPage });
function SettingsSectionPage() { return <SectionPage section="cover"><CoverSettings /></SectionPage>; }
