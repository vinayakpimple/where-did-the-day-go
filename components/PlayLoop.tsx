"use client";

import { useState } from "react";
import Globe from "@/components/Globe/Globe";
import type { GlobeView } from "@/components/Globe/GlobeTypes";
import ClockPills from "@/components/ClockPills";
import QuizCard from "@/components/QuizCard";
import StampBook from "@/components/StampBook";
import * as sound from "@/lib/sound";
import { t, type Messages } from "@/lib/i18n";

type City = { name: string; tz: string; lat: number; lon: number; country: string; cc: string };

const VIEWS: GlobeView[] = ["route", "follow", "daynight"];

export default function PlayLoop({
  from, to, pairSlug, msgs, locale,
  km, hoursLabel, polar,
  halfHour, dstKey, fromName, toName,
}: {
  from: City; to: City; pairSlug: string; msgs: Messages; locale: string;
  km: string; hoursLabel: string; polar: string | null;
  halfHour: boolean; dstKey: string;
  fromName: string; toName: string;
}) {
  const [view, setView] = useState<GlobeView>("route");
  const [flown, setFlown] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [depMin, setDepMin] = useState(780);
  const [cap, setCap] = useState<"clocks" | "takeoff" | "flip" | "half" | "quiz" | "follow" | "daynight">(
    halfHour ? "half" : "clocks",
  );

  const caption = {
    clocks: t(msgs, "play.caption.clocks"),
    takeoff: t(msgs, "play.caption.takeoff"),
    flip: t(msgs, "play.caption.dayFlip"),
    half: t(msgs, "play.caption.halfHour"),
    quiz: t(msgs, "play.caption.quiz"),
    follow: t(msgs, "play.caption.follow"),
    daynight: t(msgs, "play.caption.daynight"),
  }[cap];

  const pickView = (v: GlobeView) => {
    setView(v);
    setCap(v === "follow" ? "follow" : v === "daynight" ? "daynight" : "clocks");
  };

  const fly = () => {
    setReplayKey((n) => n + 1);
    setFlown(true);
    setCap("takeoff");
    sound.whoosh();
  };

  return (
    <section className="inflight-map">
      <Globe
        from={{ name: from.name, lat: from.lat, lon: from.lon }}
        to={{ name: to.name, lat: to.lat, lon: to.lon }}
        outbound
        replayKey={replayKey}
        km={km} hoursLabel={hoursLabel} polar={polar}
        view={view}
      />
      <div className="hud">
        <div className="hud-views" role="tablist" aria-label={t(msgs, "play.views")}>
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" className="hud-chip"
              aria-selected={view === v}
              onClick={() => pickView(v)}>
              {t(msgs, `play.view.${v}`)}
            </button>
          ))}
        </div>
        <ClockPills from={from} to={to} locale={locale} />
        <p className="hud-cap" aria-live="polite">{caption}</p>
        {flown && (
          <div className="hud-quiz">
            <QuizCard
              from={{ name: from.name, tz: from.tz }}
              to={{ name: to.name, tz: to.tz }}
              pairSlug={pairSlug} msgs={msgs} locale={locale}
              dstKey={dstKey}
              onFocus={() => setCap("quiz")}
            />
          </div>
        )}
        <StampBook slug={pairSlug} fromName={fromName} toName={toName} msgs={msgs} locale={locale} />
        <div className="hud-slider">
          <label htmlFor="takeoff">{t(msgs, "sim.takeoffTime")}</label>
          <input id="takeoff" className="slider" type="range" min={0} max={1425} step={15}
            value={depMin}
            onChange={(e) => setDepMin(+e.target.value)}
            onPointerUp={fly} onKeyUp={fly} />
        </div>
      </div>
    </section>
  );
}
