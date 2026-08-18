"use client";

import { useState } from "react";
import Globe from "@/components/Globe/Globe";
import TripSim, { type FlightState } from "@/components/TripSim";
import * as sound from "@/lib/sound";
import { t, type Messages } from "@/lib/i18n";

type CityFull = { name: string; tz: string; lat: number; lon: number };

/**
 * The hero: the 3D Earth with TripSim underneath as its control panel.
 * Committed slider/tab changes replay the flight on the globe (and whoosh,
 * if sound is on).
 */
export default function GlobePanel({
  from, to, defaultMinutes, km, hoursLabel, polar, msgs, locale, onInteract,
}: {
  from: CityFull; to: CityFull; defaultMinutes: number;
  km: string; hoursLabel: string; polar: string | null;
  msgs: Messages; locale: string;
  onInteract?: () => void;
}) {
  const [flight, setFlight] = useState<FlightState>({
    outbound: true, depMin: 780, durMin: defaultMinutes, changeId: 0,
  });

  const onFlight = (s: FlightState) => {
    setFlight((prev) => {
      if (s.changeId > prev.changeId) {
        sound.whoosh();
        onInteract?.();
      }
      return s;
    });
  };

  return (
    <>
      <Globe
        from={{ name: from.name, lat: from.lat, lon: from.lon }}
        to={{ name: to.name, lat: to.lat, lon: to.lon }}
        outbound={flight.outbound}
        replayKey={flight.changeId}
        km={km} hoursLabel={hoursLabel} polar={polar}
      />
      <p className="note globehint" aria-hidden="true">🌍 {t(msgs, "globe.dragHint")}</p>
      <TripSim from={from} to={to} defaultMinutes={defaultMinutes}
        msgs={msgs} locale={locale} onFlight={onFlight} />
    </>
  );
}
