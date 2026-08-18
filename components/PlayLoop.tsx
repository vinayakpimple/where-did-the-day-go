"use client";

import { useState, type ReactNode } from "react";
import Globe from "@/components/Globe/Globe";
import type { GlobeView } from "@/components/Globe/GlobeTypes";
import ClockPills from "@/components/ClockPills";
import QuizCard from "@/components/QuizCard";
import StampBook from "@/components/StampBook";
import * as sound from "@/lib/sound";
import { openPassport } from "@/lib/passport";
import { t, type Messages } from "@/lib/i18n";

type City = { name: string; tz: string; lat: number; lon: number; country: string; cc: string };

const VIEWS: GlobeView[] = ["route", "follow", "daynight"];
const STEP_COUNT = 9;

function takeoffClock(min: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, Math.floor(min / 60), min % 60)));
}

export default function PlayLoop({
  from, to, pairSlug, msgs, locale,
  km, hoursLabel, polar,
  halfHour, dstKey, fromName, toName, extras,
}: {
  from: City; to: City; pairSlug: string; msgs: Messages; locale: string;
  km: string; hoursLabel: string; polar: string | null;
  halfHour: boolean; dstKey: string;
  fromName: string; toName: string;
  extras?: ReactNode;
}) {
  const [view, setView] = useState<GlobeView>("route");
  const [step, setStep] = useState(1);
  const [flown, setFlown] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [depMin, setDepMin] = useState(780);
  const [outbound, setOutbound] = useState(true);
  const [grownups, setGrownups] = useState(false);

  const caption = t(msgs, `play.step.${step}`);
  const takeoffLabel = takeoffClock(depMin, locale);

  const pickView = (v: GlobeView) => {
    setView(v);
    if (v === "follow" && step === 6) setStep(7);
    if (v === "daynight" && step >= 6) setStep(Math.max(step, 8));
  };

  const fly = () => {
    setOutbound(true);
    setReplayKey((n) => n + 1);
    setFlown(true);
    sound.whoosh();
    if (step <= 3) setStep(4);
  };

  const flyHome = () => {
    setView("route");
    setOutbound(false);
    setReplayKey((n) => n + 1);
    setFlown(true);
    sound.whoosh();
    setStep(9);
  };

  const chipGlow = (v: GlobeView) =>
    (step === 6 && v === "follow") || (step === 7 && v === "daynight");

  return (
    <section className="inflight-map">
      <Globe
        from={{ name: from.name, lat: from.lat, lon: from.lon }}
        to={{ name: to.name, lat: to.lat, lon: to.lon }}
        outbound={outbound}
        replayKey={replayKey}
        km={km} hoursLabel={hoursLabel} polar={polar}
        view={view}
      />
      <div className="hud">
        <button type="button" className="hud-grownups-btn"
          onClick={() => setGrownups(true)}>
          {t(msgs, "play.grownups")}
        </button>

        <div className="hud-views" role="tablist" aria-label={t(msgs, "play.views")}>
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" className="hud-chip"
              aria-selected={view === v}
              data-glow={chipGlow(v) || undefined}
              onClick={() => pickView(v)}>
              {t(msgs, `play.view.${v}`)}
            </button>
          ))}
        </div>

        <ClockPills from={from} to={to} locale={locale} glow={step === 1} />

        <ol className="hud-steps" aria-label={t(msgs, "play.steps")}>
          {Array.from({ length: STEP_COUNT }, (_, i) => {
            const n = i + 1;
            return (
              <li key={n} data-glow={step === n || undefined}
                className={n < step ? "is-done" : n === step ? "is-now" : "is-todo"}
                aria-current={step === n ? "step" : undefined}>
                <span>{n}</span>
              </li>
            );
          })}
        </ol>

        <p className="hud-cap" aria-live="polite">
          {caption}
          {step === 1 && halfHour ? ` ${t(msgs, "play.caption.halfHour")}` : ""}
        </p>

        {step === 1 && (
          <button type="button" className="hud-go" data-glow="true"
            onClick={() => { sound.tick(); setStep(2); }}>
            {t(msgs, "play.start")}
          </button>
        )}

        {flown && step === 4 && (
          <div className="hud-quiz" data-glow="true">
            <QuizCard
              from={{ name: from.name, tz: from.tz }}
              to={{ name: to.name, tz: to.tz }}
              pairSlug={pairSlug} msgs={msgs} locale={locale}
              dstKey={dstKey}
              onStamped={() => setStep(5)}
            />
          </div>
        )}

        {step === 5 && (
          <StampBook
            fromName={fromName} toName={toName}
            msgs={msgs} locale={locale}
            glow
            nextLabel={t(msgs, "play.next")}
            onNext={() => setStep(6)}
          />
        )}

        {step >= 2 && (
          <div className="hud-slider">
            <div className="hud-slider-main" data-glow={step === 2 || undefined}>
              <div className="hud-slider-lab">
                <label htmlFor="takeoff">{t(msgs, "sim.takeoffTime")}</label>
                <span className="hud-slider-time" aria-live="polite">{takeoffLabel}</span>
              </div>
              <input id="takeoff" className="slider" type="range" min={0} max={1425} step={15}
                value={depMin}
                aria-valuetext={takeoffLabel}
                onChange={(e) => {
                  setDepMin(+e.target.value);
                  if (step === 2) setStep(3);
                }} />
            </div>
            {step >= 2 && step <= 3 && (
              <button type="button" className="hud-go hud-go-dock"
                data-glow={step === 3 || undefined}
                onClick={fly}>
                {t(msgs, "sim.takeoff")}
              </button>
            )}
            {step === 8 && (
              <button type="button" className="hud-go hud-go-dock" data-glow="true"
                onClick={flyHome}>
                {t(msgs, "play.flyHome")}
              </button>
            )}
            {step >= 9 && (
              <button type="button" className="hud-go hud-go-dock" data-glow="true"
                onClick={() => openPassport()}>
                {t(msgs, "play.openBook")}
              </button>
            )}
          </div>
        )}
      </div>

      {grownups && extras && (
        <>
          <div className="grownups-backdrop" onClick={() => setGrownups(false)} />
          <div className="grownups-sheet" role="dialog" aria-modal="true"
            aria-label={t(msgs, "play.grownups")}>
            <div className="grownups-head">
              <div>
                <div className="kicker">{t(msgs, "play.grownups")}</div>
                <p className="grownups-lead">{t(msgs, "play.grownups.lead")}</p>
              </div>
              <button type="button" className="tab" onClick={() => setGrownups(false)}>
                {t(msgs, "play.grownups.close")}
              </button>
            </div>
            <div className="grownups-body">{extras}</div>
          </div>
        </>
      )}
    </section>
  );
}
