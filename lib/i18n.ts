export const LOCALES = [
  "en", "hi", "es", "pt", "fr", "de", "ar", "zh", "ja", "ru", "id", "bn",
] as const;

export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES: ReadonlySet<string> = new Set(["ar"]);

export function dir(locale: string): "rtl" | "ltr" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

/** BCP-47 tags for hreflang and Intl. */
export const HREFLANG: Record<Locale, string> = {
  en: "en", hi: "hi", es: "es", pt: "pt", fr: "fr", de: "de",
  ar: "ar", zh: "zh-Hans", ja: "ja", ru: "ru", id: "id", bn: "bn",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English", hi: "हिन्दी", es: "Español", pt: "Português", fr: "Français",
  de: "Deutsch", ar: "العربية", zh: "简体中文", ja: "日本語", ru: "Русский",
  id: "Bahasa Indonesia", bn: "বাংলা",
};

export type Messages = Record<string, string>;

const cache = new Map<string, Messages>();

export async function getMessages(locale: string): Promise<Messages> {
  const key = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = (await import("@/messages/en.json")).default as Messages;
  let msgs = base;
  if (key !== "en") {
    try {
      const loaded = (await import(`@/messages/${key}.json`)).default as Messages;
      msgs = { ...base, ...loaded };   // English fills any gap rather than showing a key
    } catch { msgs = base; }
  }
  cache.set(key, msgs);
  return msgs;
}

/** Interpolate {named} placeholders. Missing values are left visible in dev. */
export function t(msgs: Messages, key: string, vars?: Record<string, string | number>): string {
  const raw = msgs[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) =>
    vars[name] !== undefined ? String(vars[name]) : m,
  );
}
