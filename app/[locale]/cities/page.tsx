import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, RANKED, pairSlug } from "@/lib/cities";
import { LOCALES, HREFLANG, isLocale, getMessages, t } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { offsetMinutes, utcLabel } from "@/lib/tz";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const msgs = await getMessages(locale);
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = `${SITE_URL}/${l}/cities`;
  languages["x-default"] = `${SITE_URL}/en/cities`;
  return {
    title: t(msgs, "cities.title"),
    description: t(msgs, "cities.note", {
      n: String(CITIES.length), z: String(new Set(CITIES.map((c) => c.tz)).size),
    }),
    alternates: { canonical: `${SITE_URL}/${locale}/cities`, languages },
  };
}

export default async function CitiesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const msgs = await getMessages(locale);
  const now = new Date();

  const byCountry = new Map<string, typeof CITIES>();
  for (const c of [...CITIES].sort((a, b) => a.name.localeCompare(b.name))) {
    const arr = byCountry.get(c.country) ?? [];
    arr.push(c);
    byCountry.set(c.country, arr);
  }
  const countries = [...byCountry.keys()].sort();
  const hub = RANKED[0];

  return (
    <>
      <h1>{t(msgs, "cities.title")}</h1>
      <p className="dek">
        {t(msgs, "cities.note", {
          n: String(CITIES.length), z: String(new Set(CITIES.map((c) => c.tz)).size),
        })}
      </p>
      {countries.map((country) => (
        <section className="card" key={country}>
          <h2>{country}</h2>
          <div className="linkgrid" style={{ marginTop: 12 }}>
            {byCountry.get(country)!.map((c) => {
              const other = c.slug === hub.slug ? RANKED[1] : hub;
              return (
                <Link key={c.slug} href={`/${locale}/${pairSlug(c.slug, other.slug)}`}>
                  {c.name}
                  <span className="sub">{utcLabel(offsetMinutes(now, c.tz))} · {c.tz}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
