import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCity, topPairs, pairSlug, CITIES } from "@/lib/cities";
import { LOCALES, HREFLANG, isLocale, getMessages, t } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import HomeHero from "@/components/HomeHero";
import PassportTeaser from "@/components/PassportTeaser";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const msgs = await getMessages(locale);
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = `${SITE_URL}/${l}`;
  languages["x-default"] = `${SITE_URL}/en`;
  const title = t(msgs, "meta.home.title");
  const description = t(msgs, "meta.home.description");
  return {
    title, description,
    alternates: { canonical: `${SITE_URL}/${locale}`, languages },
    openGraph: { title, description, url: `${SITE_URL}/${locale}`, locale: HREFLANG[locale], type: "website" },
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const msgs = await getMessages(locale);

  const popular = topPairs(24);
  // split the raw message on the {day} token itself — no sentinel character needed,
  // so the file stays plain text and survives any transport
  const [h1Before, h1After = ""] = (msgs["home.h1"] ?? "").split("{day}");
  const highlight = t(msgs, "home.h1.highlight");

  const zones = new Set(CITIES.map((c) => c.tz)).size;

  return (
    <>
      <div className="eyebrow">{t(msgs, "site.tagline")}</div>
      <h1>{h1Before}<span className="g">{highlight}</span>{h1After}</h1>
      <p className="dek">{t(msgs, "home.intro")}</p>

      <section className="card">
        <HomeHero locale={locale} msgs={msgs}
          initialFrom={getCity("san-francisco")!} initialTo={getCity("new-delhi")!} />
      </section>

      <section className="card">
        <PassportTeaser msgs={msgs} locale={locale} totalCities={CITIES.length} />
      </section>

      <section className="card">
        <h2>{t(msgs, "home.popular")}</h2>
        <div className="linkgrid" style={{ marginTop: 14 }}>
          {popular.map(([a, b]) => {
            const ca = getCity(a)!, cb = getCity(b)!;
            return (
              <Link key={`${a}-${b}`} href={`/${locale}/${pairSlug(a, b)}`}>
                {ca.name} → {cb.name}
                <span className="sub">{ca.country} → {cb.country}</span>
              </Link>
            );
          })}
        </div>
        <p style={{ marginTop: 18 }}>
          <Link href={`/${locale}/cities`}>{t(msgs, "home.browse")} →</Link>
        </p>
      </section>

      <section className="card">
        <h2>{t(msgs, "home.why.title")}</h2>
        <p className="note" style={{ marginBottom: 0 }}>{t(msgs, "home.why.body")}</p>
        <p className="note" style={{ marginTop: 12, marginBottom: 0 }}>
          {t(msgs, "cities.note", { n: String(CITIES.length), z: String(zones) })}
        </p>
      </section>
    </>
  );
}
