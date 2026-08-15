import { notFound } from "next/navigation";
import Link from "next/link";
import { LOCALES, LOCALE_NAMES, HREFLANG, isLocale, dir, getMessages, t } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const msgs = await getMessages(locale);

  return (
    <html lang={HREFLANG[locale]} dir={dir(locale)}>
      <body>
        <div className="wrap">
          <div className="topbar">
            <Link href={`/${locale}`} className="brand">
              <span className="dot" aria-hidden="true" />
              {t(msgs, "site.name")}
            </Link>
            <nav className="langbar" aria-label={t(msgs, "nav.language")}>
              {LOCALES.map((l) => (
                <Link key={l} href={`/${l}`} hrefLang={HREFLANG[l]}
                  aria-current={l === locale ? "true" : undefined}>
                  {LOCALE_NAMES[l]}
                </Link>
              ))}
            </nav>
          </div>
          {children}
          <footer>
            <b>{t(msgs, "footer.numbers")}</b> {t(msgs, "footer.body")}
          </footer>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: t(msgs, "site.name"),
              url: `${SITE_URL}/${locale}`,
              inLanguage: HREFLANG[locale],
              description: t(msgs, "meta.home.description"),
            }),
          }}
        />
      </body>
    </html>
  );
}
