"use client";

import { useState } from "react";
import GlobePanel from "@/components/GlobePanel";
import LiveClocks from "@/components/LiveClocks";
import QuizCard from "@/components/QuizCard";
import StampBook from "@/components/StampBook";
import { t, type Messages } from "@/lib/i18n";

type City = { name: string; tz: string; lat: number; lon: number; country: string; cc: string };

export default function PlayLoop({
  from, to, pairSlug, msgs, locale,
  defaultMinutes, km, hoursLabel, polar,
  halfHour, dstKey, fromName, toName,
}: {
  from: City; to: City; pairSlug: string; msgs: Messages; locale: string;
  defaultMinutes: number; km: string; hoursLabel: string; polar: string | null;
  halfHour: boolean; dstKey: string;
  fromName: string; toName: string;
}) {
  const [cap, setCap] = useState<"clocks" | "takeoff" | "flip" | "half" | "quiz">(
    halfHour ? "half" : "clocks",
  );

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
      <div className="playstage">
        <GlobePanel
          from={from} to={to}
          defaultMinutes={defaultMinutes}
          km={km} hoursLabel={hoursLabel} polar={polar}
          msgs={msgs} locale={locale}
          onInteract={() => setCap("takeoff")}
        />
        <LiveClocks from={from} to={to} msgs={msgs} locale={locale} />
      </div>
      <QuizCard
        from={{ name: from.name, tz: from.tz }}
        to={{ name: to.name, tz: to.tz }}
        pairSlug={pairSlug} msgs={msgs} locale={locale}
        dstKey={dstKey}
        onFocus={() => setCap("quiz")}
      />
      <StampBook slug={pairSlug} fromName={fromName} toName={toName} msgs={msgs} locale={locale} />
    </section>
  );
}
