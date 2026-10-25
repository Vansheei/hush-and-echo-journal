import { Button } from "@/components/ui/button";
import { useAppearance, setAppearance } from "@/lib/appearance";
import { LANGUAGES } from "@/lib/i18n";
export function LanguageSettings() {
  const look = useAppearance();
  return <div className="flex flex-wrap gap-3">{LANGUAGES.map(language => <Button key={language.value} variant={look.language === language.value ? "default" : "outline"} aria-pressed={look.language === language.value} lang={language.value} onClick={() => setAppearance({ language: language.value })}>{language.name}</Button>)}</div>;
}