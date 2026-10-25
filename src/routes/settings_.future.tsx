import { createFileRoute } from "@tanstack/react-router";
import { FutureFeatures } from "@/components/diary/FutureFeatures";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings_/future")({ ssr: false, head: () => settingsHead("future"), component: SettingsSectionPage });
function SettingsSectionPage() { return <SectionPage section="future"><FutureFeatures /></SectionPage>; }
