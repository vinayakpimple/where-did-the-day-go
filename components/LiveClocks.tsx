"use client";

import { useEffect, useRef, useState } from "react";
import { partsIn, gapMinutes, humanGap, type Parts } from "@/lib/tz";
import { activityBadge, activityVerb, sky, brightSky } from "@/lib/activity";
import { t, type Messages } from "@/lib/i18n";

type CityLite = { name: string; country: string; tz: string; cc: string };

function ClockFace({ h, m, s, accent, bright }: { h: number; m: number; s: number; accent: string; bright: boolean }) {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, long = i % 3 === 0;
    ticks.push(
      <line key={i}
        x1={50 + Math.sin(a) * (long ? 34 : 36.5)} y1={50 - Math.cos(a) * (long ? 34 : 36.5)}
        x2={50 + Math.sin(a) * 39.5} y2={50 - Math.cos(a) * 39.5}
        stroke={bright ? "rgba(8,20,42,.72)" : "rgba(255,255,255,.85)"}
        strokeWidth={long ? 2.6 : 1.4} strokeLinecap="round" />,
    );
  }
  const hand = (ang: number, len: number, w: number, col: string, key: string) => (
    <line key={key}
      x1={50 - Math.sin(ang) * 4} y1={50 + Math.cos(ang) * 4}
      x2={50 + Math.sin(ang) * len} y2={50 - Math.cos(ang) * len}
      stroke={col} strokeWidth={w} strokeLinecap="round" />
  );
  const ink = bright ? "#08172f" : "#fff";
  return (
    <svg viewBox="0 0 100 100" className="face" aria-hidden="true">
      <circle cx={50} cy={50} r={44}
        fill={bright ? "rgba(255,255,255,.62)" : "rgba(0,0,0,.30)"}
        stroke={bright ? "rgba(8,20,42,.45)" : "rgba(255,255,255,.55)"} strokeWidth={2.5} />
      {ticks}
      {hand(((h % 12) + m / 60) * (Math.PI / 6), 21, 5.2, ink, "h")}
      {hand((m + s / 60) * (Math.PI / 30), 31, 3.6, ink, "m")}
      {hand(s * (Math.PI / 30), 34, 1.6, accent, "s")}
      <circle cx={50} cy={50} r={3.2} fill={accent} />
    </svg>
  );
}

function flagOf(cc: string) {
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function LiveClocks({
  from, to, msgs, locale,
}: { from: CityLite; to: CityLite; msgs: Messages; locale: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    // mount-only render on the client so server HTML and first paint agree
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(id); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const units = {
    hour: t(msgs, "unit.hour"), hours: t(msgs, "unit.hours"),
    minute: t(msgs, "unit.minute"), minutes: t(msgs, "unit.minutes"),
  };

  if (!now) {
    return <div className="clocks" aria-busy="true">
      <div className="city skeleton" /><div className="gapcol" /><div className="city skeleton" />
    </div>;
  }

  const a: Parts = partsIn(now, from.tz);
  const b: Parts = partsIn(now, to.tz);
  const gap = gapMinutes(now, from.tz, to.tz);

  const aWk = isWeekend(a), bWk = isWeekend(b);
  const aBright = brightSky(a.hour), bBright = brightSky(b.hour);

  const dateFmt = (p: Parts) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(p.year, p.month - 1, p.day)));
  const dayFmt = (p: Parts) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
      .format(new Date(Date.UTC(p.year, p.month - 1, p.day)));
  const timeFmt = (p: Parts) => {
    const d = new Date(Date.UTC(2020, 0, 1, p.hour, p.minute));
    const parts = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
      .formatToParts(d);
    const main = parts.filter((x) => x.type !== "dayPeriod").map((x) => x.value).join("").trim();
    const ap = parts.find((x) => x.type === "dayPeriod")?.value ?? "";
    return { main, ap };
  };

  const Card = ({ c, p, bright, weekend, accent }: {
    c: CityLite; p: Parts; bright: boolean; weekend: boolean; accent: string;
  }) => {
    const { main, ap } = timeFmt(p);
    return (
      <div className={"city" + (bright ? " bright" : "")} style={{ backgroundImage: sky(p.hour) }}>
        <div className="flagline">{flagOf(c.cc)} {c.country}</div>
        <div className="cname">{c.name}</div>
        <ClockFace h={p.hour} m={p.minute} s={p.second} accent={accent} bright={bright} />
        <div className="digital">
          {main}
          <span className="sec">:{String(p.second).padStart(2, "0")}</span>
          {ap ? <span className="ampm">{ap}</span> : null}
        </div>
        <div className="cdate">{dateFmt(p)}</div>
        <div className="doing">{activityBadge(msgs, p.hour, weekend)}</div>
      </div>
    );
  };

  const sameDay = a.day === b.day && a.month === b.month && a.year === b.year;
  const gapLabel = humanGap(gap, units);

  return (
    <>
      <div className="clocks">
        <Card c={from} p={a} bright={aBright} weekend={aWk} accent={aBright ? "#0d5cb6" : "#8fd0ff"} />
        <div className="gapcol">
          <div className="gaplbl">
            {gap === 0
              ? t(msgs, "clocks.sameTime")
              : t(msgs, gap > 0 ? "clocks.aheadBy" : "clocks.behindBy", { to: to.name })}
          </div>
          {gap !== 0 && <div className="gapamt">{gapLabel}</div>}
          <div className="gaparrow" aria-hidden="true">→</div>
        </div>
        <Card c={to} p={b} bright={bBright} weekend={bWk} accent={bBright ? "#8a5a00" : "#ffcf7a"} />
      </div>
      <p className="bignow">
        {t(msgs, "clocks.sentence", {
          fromCity: from.name, toCity: to.name,
          fromDoing: activityVerb(msgs, a.hour, aWk),
          toDoing: activityVerb(msgs, b.hour, bWk),
        })}
        {sameDay ? "." : " — "}
        {!sameDay && t(msgs, "clocks.sentence.differentDay", {
          fromCity: from.name, toCity: to.name,
          fromDay: dayFmt(a), toDay: dayFmt(b),
        })}
      </p>
    </>
  );
}

function isWeekend(p: Parts) {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return d === 0 || d === 6;
}
