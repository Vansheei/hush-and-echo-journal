import { useAppearance, getAppearance } from "@/lib/appearance";
import { format as dateFormat } from "date-fns";
import { enGB, hi, de } from "date-fns/locale";
import { messages } from "./messages";

export type Language = "en" | "hi" | "de";
export const LANGUAGES = [{ value: "en", name: "English" }, { value: "hi", name: "हिन्दी" }, { value: "de", name: "Deutsch" }] as const;
export function translate(text: string, language: Language, values: Record<string, string | number> = {}) {
  const pair = messages[text];
  if (!pair && /^Preparing local search \d+\/\d+…$/.test(text)) {
    const numbers = text.match(/\d+/g) ?? [];
    return translate("Preparing local search {current}/{total}…", language, { current: numbers[0] ?? "0", total: numbers[1] ?? "0" });
  }
  const message = language === "en" ? text : pair?.[language === "hi" ? 0 : 1] ?? text;
  return message.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
export function t(text: string, values?: Record<string, string | number>) {
  return translate(text, getAppearance().language, values);
}
export function useLanguage() { return useAppearance().language; }
export function format(date: Date | number, pattern: string) {
  const locale = { en: enGB, hi, de }[getAppearance().language];
  return dateFormat(date, pattern, { locale });
}