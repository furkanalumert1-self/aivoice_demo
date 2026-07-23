import { cookies } from "next/headers";
import type { Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const lang = store.get("klinik_lang")?.value;
  if (lang === "en" || lang === "it") return lang;
  return "tr";
}
