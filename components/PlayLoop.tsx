"use client";

import { useState } from "react";
import GlobePanel from "@/components/GlobePanel";
import LiveClocks from "@/components/LiveClocks";
import DayRibbon from "@/components/DayRibbon";
import QuizCard from "@/components/QuizCard";
import StampBook from "@/components/StampBook";
import { t, type Messages } from "@/lib/i18n";

type City = { name: string; tz: string; lat: number; lon: number; country: string; cc: string };

export default function PlayLoop({
  from, to, pairSlug, msgs, locale,
  defaultMinutes, km, hoursLabel, polar,
  gapMin, halfHour, dstKey, fromName, toName,
}: {
  from: City; to: City; pairSlug: string; msgs: Messages; locale: string;
  defaultMinutes: number; km: string; hoursLabel: string; polar: string | null;
  gapMin: number; halfHour: boolean; dstKey: string;
  fromName: string; toName: string;
}) {
  const [cap, setCap] = useState<"clocks" | "takeoff" | "flip" | "half" | "quiz">(
    halfHour ? "half" : "clocks",
  );
  const [stamped, setStamped] = useState(false);

  const caption = {
    clocks: t(msgs, "play.caption.clocks"),
    takeoff: t(msgs, "play.caption.takeoff"),
    flip: t(msgs, "play.caption.dayFlip"),
    half: t(msgs, "play.caption.halfHour"),
    quiz: t(msgs, "play.caption.quiz"),
  }[cap];

  return (
    <section className="card playloop">
      <p className="playcap" aria-live="polite">{caption}</p>
      <GlobePanel
        from={from} to={to}
        defaultMinutes={defaultMinutes}
        km={km} hoursLabel={hoursLabel} polar={polar}
        msgs={msgs} locale={locale}
        onInteract={() => setCap("takeoff")}
      />
      <LiveClocks from={from} to={to} msgs={msgs} locale={locale} />
      <DayRibbon fromName={from.name} toName={to.name} gapMin={gapMin} msgs={msgs} locale={locale} />
      <QuizCard
        from={{ name: from.name, tz: from.tz }}
        to={{ name: to.name, tz: to.tz }}
        pairSlug={pairSlug} msgs={msgs} locale={locale}
        dstKey={dstKey}
        onFocus={() => setCap("quiz")}
        onStamped={() => setStamped(true)}
      />
      {stamped && (
        <StampBook slug={pairSlug} fromName={fromName} toName={toName} msgs={msgs} locale={locale} />
      )}
    </section>
  );
}
