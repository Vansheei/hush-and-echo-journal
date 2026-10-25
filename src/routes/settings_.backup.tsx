import { createFileRoute } from "@tanstack/react-router";
import { BackupSettings } from "@/components/diary/settings/BackupSettings";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
export const Route = createFileRoute("/settings_/backup")({ ssr: false, head: () => settingsHead("backup"), component: SettingsSectionPage });
function SettingsSectionPage() { return <SectionPage section="backup"><BackupSettings /></SectionPage>; }
