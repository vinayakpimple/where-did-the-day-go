"use client";

import { useState } from "react";
import { greatCircleKm, estimateFlightMinutes, hm } from "@/lib/tz";
import type { City } from "@/lib/cities";
import { t, type Messages } from "@/lib/i18n";
import Globe from "@/components/Globe/Globe";
import CityPicker from "@/components/CityPicker";

/**
 * Homepage hero: the globe mirrors the picker live, before the child even
 * presses Go. The globe remounts per pair (key) — Cesium is cached after the
 * first dynamic import.
 */
export default function HomeHero({
  locale, msgs, initialFrom, initialTo,
}: { locale: string; msgs: Messages; initialFrom: City; initialTo: City }) {
  const [pair, setPair] = useState<{ from: City; to: City }>({ from: initialFrom, to: initialTo });

  const km = greatCircleKm(pair.from.lat, pair.from.lon, pair.to.lat, pair.to.lon);
  const kmLabel = new Intl.NumberFormat(locale).format(Math.round(km));

  return (
    <>
      <Globe key={`${pair.from.slug}-${pair.to.slug}`}
        from={{ name: pair.from.name, lat: pair.from.lat, lon: pair.from.lon }}
        to={{ name: pair.to.name, lat: pair.to.lat, lon: pair.to.lon }}
        km={`${kmLabel} km`} hoursLabel={hm(estimateFlightMinutes(km))} polar={null}
        flyLabel={t(msgs, "globe.flyRoute")}
        loadingLabel={t(msgs, "globe.loading")}
        failedLabel={t(msgs, "globe.failed")}
        retryLabel={t(msgs, "globe.retry")} />
      <p className="note globehint" aria-hidden="true">{t(msgs, "globe.dragHint")}</p>
      <CityPicker locale={locale} msgs={msgs}
        initialFrom={initialFrom} initialTo={initialTo}
        onChange={(from, to) => setPair({ from, to })} />
    </>
  );
}
