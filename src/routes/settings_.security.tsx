import { createFileRoute } from "@tanstack/react-router";
import { SecuritySettings } from "@/components/diary/SecuritySettings";
import { SectionPage } from "@/components/diary/settings/SectionPage";
import { settingsHead } from "@/lib/settings-sections";
import { LockSettings } from "@/components/diary/settings/LockSettings";
export const Route = createFileRoute("/settings_/security")({ ssr: false, head: () => settingsHead("security"), component: SettingsSectionPage });
function SettingsSectionPage() { return <SectionPage section="security"><SecuritySettings /><LockSettings /></SectionPage>; }
