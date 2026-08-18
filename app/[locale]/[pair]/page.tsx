import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parsePair, pairSlug, topPairs, RANKED } from "@/lib/cities";
import { LOCALES, HREFLANG, isLocale, getMessages, t } from "@/lib/i18n";
import { routeFacts } from "@/lib/route-facts";
import { SITE_URL, PRERENDER_PAIRS } from "@/lib/site";
import { clock12, weekdayName, humanGap } from "@/lib/tz";
import LiveClocks from "@/components/LiveClocks";
import DayRibbon from "@/components/DayRibbon";
import GlobePanel from "@/components/GlobePanel";
import QuizCard from "@/components/QuizCard";
import PassportStamp from "@/components/PassportStamp";

/** Long-tail pairs render on first request, then stay cached. */
export const dynamicParams = true;
/** Short enough that a cached page never states a stale gap across a DST switch. */
export const revalidate = 3600;

export function generateStaticParams() {
  const pairs = topPairs(PRERENDER_PAIRS);
  return LOCALES.flatMap((locale) =>
    pairs.map(([from, to]) => ({ locale, pair: pairSlug(from, to) })),
  );
}

type Props = { params: Promise<{ locale: string; pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params;
  if (!isLocale(locale)) return {};
  const parsed = parsePair(pair);
  if (!parsed) return {};
  const { from, to } = parsed;
  const msgs = await getMessages(locale);
  const f = routeFacts(from, to, locale, msgs);

  const title = t(msgs, "meta.route.title", { from: from.name, to: to.name });
  const description = t(msgs, "meta.route.description", {
    from: from.name, to: to.name, gap: f.gapLabel, direction: f.direction,
  });

  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[HREFLANG[l]] = `${SITE_URL}/${l}/${pair}`;
  languages["x-default"] = `${SITE_URL}/en/${pair}`;

  return {
    title, description,
    alternates: { canonical: `${SITE_URL}/${locale}/${pair}`, languages },
    openGraph: {
      title, description, type: "website",
      url: `${SITE_URL}/${locale}/${pair}`,
      locale: HREFLANG[locale],
      siteName: t(msgs, "site.name"),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RoutePage({ params }: Props) {
  const { locale, pair } = await params;
  if (!isLocale(locale)) notFound();
  const parsed = parsePair(pair);
  if (!parsed) notFound();
  const { from, to } = parsed;
  const msgs = await getMessages(locale);
  const f = routeFacts(from, to, locale, msgs);

  const subKey = f.gap === 0 ? "route.subtitle.same" : f.gap > 0 ? "route.subtitle.ahead" : "route.subtitle.behind";
  const subtitle = t(msgs, subKey, { from: from.name, to: to.name, gap: f.gapLabel });

  const fromTime = clock12(f.nowParts.from.hour, f.nowParts.from.minute, locale);
  const toTime = clock12(f.nowParts.to.hour, f.nowParts.to.minute, locale);
  const fromDay = weekdayName(f.nowParts.from, locale);
  const toDay = weekdayName(f.nowParts.to, locale);
  const sameDay =
    f.nowParts.from.day === f.nowParts.to.day &&
    f.nowParts.from.month === f.nowParts.to.month &&
    f.nowParts.from.year === f.nowParts.to.year;
  const toLater =
    f.nowParts.to.year > f.nowParts.from.year ||
    (f.nowParts.to.year === f.nowParts.from.year &&
      (f.nowParts.to.month > f.nowParts.from.month ||
        (f.nowParts.to.month === f.nowParts.from.month && f.nowParts.to.day > f.nowParts.from.day)));

  const units = {
    hour: t(msgs, "unit.hour"), hours: t(msgs, "unit.hours"),
    minute: t(msgs, "unit.minute"), minutes: t(msgs, "unit.minutes"),
  };
  // Whole days stay in the number — do not take % 1440 (invariant 2).
  const clockMoved = humanGap(f.flightMin + f.gap, units);
  const flightWords = humanGap(f.flightMin, units);

  const dateLine = sameDay
    ? t(msgs, "hero.dates.same", { day: fromDay })
    : t(msgs, toLater ? "hero.dates.toAhead" : "hero.dates.fromAhead", {
      from: from.name, to: to.name, fromDay, toDay,
    });
  const jumpLine = f.gap === 0
    ? t(msgs, "hero.jump.flat", { hours: flightWords })
    : t(msgs, f.gap > 0 ? "hero.jump.east" : "hero.jump.west", {
      hours: flightWords, clockMoved,
    });

  // FAQ #1 is the gap only. dstNote used to be glued on and leaked "Yes."
  const faqs = [
    { q: t(msgs, "faq.q1", { from: from.name, to: to.name }),
      a: t(msgs, "faq.a1", { from: from.name, to: to.name, gap: f.gapLabel, direction: f.direction }) },
    { q: t(msgs, "faq.q2", { from: from.name, to: to.name }),
      a: t(msgs, "faq.a2", { from: from.name, to: to.name, noonTime: f.noonToLabel }) },
    { q: t(msgs, "faq.q3", { from: from.name, to: to.name }),
      a: t(msgs, "faq.a3", { from: from.name, to: to.name, km: f.kmLabel, hours: f.flightLabel }) },
    { q: t(msgs, "faq.q4", { from: from.name, to: to.name }),
      a: t(msgs, "faq.a4", { from: from.name, to: to.name }) },
    { q: t(msgs, "faq.q5", { from: from.name, to: to.name }),
      a: t(msgs, "faq.a5", { dstAnswer: f.dstNote }) },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqs.map((x) => ({
        "@type": "Question", name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t(msgs, "nav.home"), item: `${SITE_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: `${from.name} → ${to.name}`, item: `${SITE_URL}/${locale}/${pair}` },
      ],
    },
  ];

  const relatedFrom = RANKED
    .filter((c) => c.slug !== from.slug && c.slug !== to.slug && c.tz !== from.tz)
    .slice(0, 8);
  const relatedTo = RANKED
    .filter((c) => c.slug !== to.slug && c.slug !== from.slug && c.tz !== to.tz)
    .slice(0, 8);

  const ribbonNote =
    Math.abs(f.gap % 60) === 30 ? t(msgs, "ribbon.note.halfHour")
      : Math.abs(f.gap % 60) === 45 ? t(msgs, "ribbon.note.quarterHour")
        : "";

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="hero">
        <div className="eyebrow">{from.country} → {to.country}</div>
        <h1>{t(msgs, "route.h1", { from: from.name, to: to.name })}</h1>
        <p className="sublede">{subtitle}</p>
        <p className="herotimes">
          <span className="heroleg">
            <b style={{ color: "var(--sf)" }}>{from.name}</b>
            {" "}
            <span className="herotime" dir="ltr">{fromTime}</span>
          </span>
          <span className="herodot" aria-hidden="true">·</span>
          <span className="heroleg">
            <b style={{ color: "var(--del)" }}>{to.name}</b>
            {" "}
            <span className="herotime" dir="ltr">{toTime}</span>
          </span>
        </p>
        <p className="herojump">
          {dateLine}{" "}{jumpLine}
        </p>
        <p className="dek hero-meta">
          {from.name} {f.fromUtc} · {to.name} {f.toUtc}
          {" — "}
          <Link href={`/${locale}/${pairSlug(to.slug, from.slug)}`}>
            {t(msgs, "route.reverse", { from: from.name, to: to.name })}
          </Link>
        </p>
        <LiveClocks from={from} to={to} msgs={msgs} locale={locale} />
      </header>

      <section className="card trip" aria-labelledby="trip-title">
        <h2 id="trip-title">{t(msgs, "sim.title")}</h2>
        <p className="note">
          {t(msgs, "arc.distance", { km: f.kmLabel, hours: f.flightLabel })}
          {". "}
          {t(msgs, "sim.note")}
        </p>
        <GlobePanel
          from={{ name: from.name, tz: from.tz, lat: from.lat, lon: from.lon }}
          to={{ name: to.name, tz: to.tz, lat: to.lat, lon: to.lon }}
          defaultMinutes={f.flightMin}
          km={`${f.kmLabel} km`} hoursLabel={f.flightLabel}
          polar={f.isPolar ? `${f.peakLat}°` : null}
          msgs={msgs} locale={locale} />
        <p className="note" style={{ marginBottom: 0 }}>
          {t(msgs, "arc.note", { from: from.name, to: to.name, hours: f.flightLabel })}
          {f.isPolar ? " " + t(msgs, "arc.note.polar", { lat: String(f.peakLat) }) : ""}
        </p>
      </section>

      <section className="card" aria-labelledby="ribbon-title">
        <h2 id="ribbon-title">{t(msgs, "ribbon.title")}</h2>
        <p className="note">{t(msgs, "ribbon.note")} {ribbonNote}</p>
        <DayRibbon fromName={from.name} toName={to.name} gapMin={f.gap} msgs={msgs} locale={locale} />
      </section>

      <section aria-labelledby="why-title">
        <h2 id="why-title">{t(msgs, "why.title")}</h2>
        <div className="whys" style={{ marginTop: 12 }}>
          <div className="why">
            <h3>{t(msgs, "why.halfHour.title")}</h3>
            <p>{t(msgs, "why.halfHour.body")}</p>
          </div>
          <div className="why">
            <h3>{t(msgs, "why.oneZone.title")}</h3>
            <p>{t(msgs, "why.oneZone.body")}</p>
          </div>
          <div className="why">
            <h3>{t(msgs, "why.dst.title")}</h3>
            <p>{t(msgs, f.dstKey === "both" ? "why.dst.bodyBoth" : f.dstKey === "neither" ? "why.dst.bodyNeither" : "why.dst.body")}</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16, marginBottom: 0 }}>
          <h2>{t(msgs, "jetlag.title")}</h2>
          <p className="note">{t(msgs, "jetlag.note", { gap: f.gapLabel, from: from.name, to: to.name })}</p>
          <div className="tips">
            {[1, 2, 3, 4].map((n) => (
              <div className="tip" key={n}>
                <span className="n">{n}</span>
                <p><b>{t(msgs, `jetlag.tip${n}.title`)}</b> {t(msgs, `jetlag.tip${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="quiz-title">
        <h2 id="quiz-title">{t(msgs, "quiz.title")}</h2>
        <QuizCard from={{ name: from.name, tz: from.tz }} to={{ name: to.name, tz: to.tz }}
          pairSlug={pair} msgs={msgs} locale={locale} />
      </section>

      <section className="card faq">
        <h2>{t(msgs, "faq.title")}</h2>
        {faqs.map((x, i) => (
          <details key={i} open={i === 0}>
            <summary>{x.q}</summary>
            <p>{x.a}</p>
          </details>
        ))}
      </section>

      <details className="card hours">
        <summary>{t(msgs, "table.toggle")}</summary>
        <p className="note">{t(msgs, "table.note")}</p>
        <div className="tablesplit">
          {[f.hourTable.slice(0, 12), f.hourTable.slice(12)].map((half, hi) => (
            <table key={hi}>
              <thead>
                <tr>
                  <th>{t(msgs, "table.fromHeader", { city: from.name })}</th>
                  <th>{t(msgs, "table.toHeader", { city: to.name })}</th>
                </tr>
              </thead>
              <tbody>
                {half.map((r, i) => (
                  <tr key={i}>
                    <td>{r.from}</td>
                    <td>{r.to}{r.rolls ? ` (${t(msgs, "ribbon.nextDay")})` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </details>

      <div className="rule" />
      <h2>{t(msgs, "nearby.title")}</h2>
      <div style={{ marginTop: 14 }}>
        <div className="kicker">{t(msgs, "nearby.fromCity", { city: from.name })}</div>
        <div className="linkgrid">
          {relatedFrom.map((c) => (
            <Link key={c.slug} href={`/${locale}/${pairSlug(from.slug, c.slug)}`}>
              {from.name} → {c.name}<span className="sub">{c.country}</span>
            </Link>
          ))}
        </div>
        <div className="kicker" style={{ marginTop: 20 }}>{t(msgs, "nearby.toCity", { city: to.name })}</div>
        <div className="linkgrid">
          {relatedTo.map((c) => (
            <Link key={c.slug} href={`/${locale}/${pairSlug(c.slug, to.slug)}`}>
              {c.name} → {to.name}<span className="sub">{c.country}</span>
            </Link>
          ))}
        </div>
      </div>

      <PassportStamp slug={pair} fromName={from.name} toName={to.name} />
    </>
  );
}
