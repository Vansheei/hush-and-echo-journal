import type { ReactNode } from "react";
import { AppHeader } from "../AppHeader";
import { sectionDetails, type SettingsSection } from "@/lib/settings-sections";
export function SectionPage({ section, children }: { section: SettingsSection; children: ReactNode }) {
  return <div className="app-shell settings-pages"><AppHeader backTo="/settings" title={sectionDetails(section).name} /><main className="space-y-6 px-5 pb-16">{children}</main></div>;
}
