export const SETTINGS_SECTIONS = [
  { id: "security", name: "Security", to: "/settings/security" },
  { id: "companion", name: "About companion", to: "/settings/companion" },
  { id: "cover", name: "Cover theme", to: "/settings/cover" },
  { id: "sounds", name: "Sounds", to: "/settings/sounds" },
  { id: "backup", name: "Encrypted backup", to: "/settings/backup" },
  { id: "future", name: "Coming later", to: "/settings/future" },
  { id: "language", name: "Language", to: "/settings/language" },
] as const;
export type SettingsSection = typeof SETTINGS_SECTIONS[number]["id"];
export function sectionDetails(id: SettingsSection) {
  const section = SETTINGS_SECTIONS.find(s => s.id === id);
  if (!section) throw new Error("Unknown Settings section");
  return section;
}
export function settingsHead(id?: SettingsSection) {
  const name = id ? sectionDetails(id).name : "Settings";
  const title = `Vanshika’s Diary — ${name}`;
  const description = id ? `Private diary settings for ${name.toLowerCase()}.` : "Your private diary’s settings sections.";
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
}
