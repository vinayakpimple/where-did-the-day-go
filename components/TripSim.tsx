"use client";

import { useEffect, useMemo, useState } from "react";
import { partsIn, zonedToInstant, offsetMinutes, hm, humanGap, type Parts } from "@/lib/tz";
import { t, type Messages } from "@/lib/i18n";

type CityLite = { name: string; tz: string };

/** Committed flight settings, for a parent that wants to animate them (the globe). */
export type FlightState = { outbound: boolean; depMin: number; durMin: number; changeId: number };

export default function TripSim({
  from, to, defaultMinutes, msgs, locale, onFlight,
}: {
  from: CityLite; to: CityLite; defaultMinutes: number; msgs: Messages; locale: string;
  onFlight?: (s: FlightState) => void;
}) {
  const [outbound, setOutbound] = useState(true);
  const [depMin, setDepMin] = useState(780);
  const [dur, setDur] = useState(defaultMinutes);
  const [today, setToday] = useState<Parts | null>(null);
  // Bumped only on committed user changes (slider release / tab press), so the
  // globe replays the flight on real input rather than on every clock tick.
  const [changeId, setChangeId] = useState(0);
  const commit = () => setChangeId((n) => n + 1);

  useEffect(() => {
    onFlight?.({ outbound, depMin, durMin: dur, changeId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outbound, depMin, dur, changeId]);

  const fromTz = outbound ? from.tz : to.tz;
  const toTz = outbound ? to.tz : from.tz;
  const fromName = outbound ? from.name : to.name;
  const toName = outbound ? to.name : from.name;

  // anchor on today's date in the departure city, and follow it over midnight
  useEffect(() => {
    const tick = () => setToday(partsIn(new Date(), fromTz));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [fromTz]);

  const units = {
    hour: t(msgs, "unit.hour"), hours: t(msgs, "unit.hours"),
    minute: t(msgs, "unit.minute"), minutes: t(msgs, "unit.minutes"),
  };

  const calc = useMemo(() => {
    if (!today) return null;
    const depInstant = zonedToInstant(today.year, today.month, today.day,
      Math.floor(depMin / 60), depMin % 60, fromTz);
    const arrInstant = new Date(depInstant.getTime() + dur * 60000);
    const dp = partsIn(depInstant, fromTz), ar = partsIn(arrInstant, toTz);
    const zoneJump = offsetMinutes(arrInstant, toTz) - offsetMinutes(depInstant, fromTz);
    return { dp, ar, zoneJump, calendar: dur + zoneJump, skipped: dp.hour * 60 + dp.minute !== depMin };
  }, [today, depMin, dur, fromTz, toTz]);

  const timeStr = (p: Parts) =>
    new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
      .format(new Date(Date.UTC(2020, 0, 1, p.hour, p.minute)));
  const dayStr = (p: Parts) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
      .format(new Date(Date.UTC(p.year, p.month - 1, p.day)));
  const dateStr = (p: Parts) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(p.year, p.month - 1, p.day)));

  if (!calc) {
    return <div className="simgrid" aria-busy="true"><div className="pod skeleton" /><div /><div className="pod skeleton" /></div>;
  }
  const { dp, ar, zoneJump, skipped } = calc;

  const fromCol = outbound ? "var(--sf)" : "var(--del)";
  const toCol = outbound ? "var(--del)" : "var(--sf)";

  let verdict: string;
  if (zoneJump === 0) {
    verdict = t(msgs, "sim.kid.same", { depDay: dayStr(dp), arrDay: dayStr(ar) });
  } else if (zoneJump > 0) {
    verdict = t(msgs, "sim.kid.flip", { depDay: dayStr(dp), arrDay: dayStr(ar) });
  } else {
    verdict = t(msgs, "sim.kid.back", { depDay: dayStr(dp), arrDay: dayStr(ar) });
  }

  return (
    <>
      <div className="tabs">
        <button className="tab" aria-pressed={outbound}
          onClick={() => { setOutbound(true); setDepMin(780); commit(); }}>
          ✈ {t(msgs, "sim.direction.out", { from: from.name, to: to.name })}
        </button>
        <button className="tab" aria-pressed={!outbound}
          onClick={() => { setOutbound(false); setDepMin(625); commit(); }}>
          ✈ {t(msgs, "sim.direction.back", { from: from.name, to: to.name })}
        </button>
      </div>

      <div className="simgrid">
        <div className="pod">
          <div className="k">{t(msgs, "sim.takeoff")}</div>
          <div className="city2">{fromName}</div>
          <div className="podt" style={{ color: fromCol }}>{timeStr(dp)}</div>
          <div className="podd">{dateStr(dp)}</div>
        </div>
        <div className="mid">
          <div className="planeicon" aria-hidden="true">✈️</div>
          <div className="track"><i style={{ background: `linear-gradient(90deg,${fromCol},${toCol})` }} /></div>
          <div className="dur">{hm(dur)}</div>
          <div className="durl">{t(msgs, "sim.inTheAir")}</div>
        </div>
        <div className="pod">
          <div className="k">{t(msgs, "sim.land")}</div>
          <div className="city2">{toName}</div>
          <div className="podt" style={{ color: toCol }}>{timeStr(ar)}</div>
          <div className="podd">{dateStr(ar)}</div>
        </div>
      </div>

      <div className="ctrlrow">
        <div className="ctrl">
          <label htmlFor="dep">{t(msgs, "sim.takeoffTime")}</label>
          <div className="cur">
            {t(msgs, "sim.takeoffIn", { time: timeStr(dp), city: fromName })}
            {skipped && ` — ${t(msgs, "sim.dstSkip", { time: timeStr({ ...dp, hour: Math.floor(depMin / 60), minute: depMin % 60 }) })}`}
          </div>
          <input className="slider" id="dep" type="range" min={0} max={1425} step={15}
            value={depMin} onChange={(e) => setDepMin(+e.target.value)}
            onPointerUp={commit} onKeyUp={commit}
            aria-valuetext={t(msgs, "sim.takeoffIn", { time: timeStr(dp), city: fromName })} />
        </div>
        <div className="ctrl">
          <label htmlFor="fdur">{t(msgs, "sim.flightLength")}</label>
          <div className="cur">{hm(dur)}</div>
          <input className="slider" id="fdur" type="range"
            min={Math.max(45, Math.round((defaultMinutes * 0.7) / 15) * 15)}
            max={Math.round((defaultMinutes * 1.35) / 15) * 15}
            step={15} value={dur} onChange={(e) => setDur(+e.target.value)}
            onPointerUp={commit} onKeyUp={commit}
            aria-valuetext={humanGap(dur, units)} />
        </div>
      </div>

      <div className="verdict" aria-live="polite">{verdict}</div>
    </>
  );
}
