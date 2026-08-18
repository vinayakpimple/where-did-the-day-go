"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_NAMES, HREFLANG, isLocale } from "@/lib/i18n";

/**
 * One compact control instead of 12 pills. Native <details> works without JS;
 * usePathname keeps the current pair / cities path when the locale changes.
 */
export default function LangSwitch({ locale, label }: { locale: string; label: string }) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/[^/]+/, "") || "";
  const current = isLocale(locale) ? LOCALE_NAMES[locale] : locale;

  return (
    <nav className="langmenu" aria-label={label}>
      <details>
        <summary>
          <span className="langmenu-k">{label}</span>
          <span className="langmenu-v">{current}</span>
        </summary>
        <div className="langmenu-list">
          {LOCALES.map((l) => (
            <Link key={l} href={`/${l}${rest}`} hrefLang={HREFLANG[l]}
              aria-current={l === locale ? "true" : undefined}>
              {LOCALE_NAMES[l]}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
