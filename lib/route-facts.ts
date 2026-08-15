import type { City } from "./cities";
import {
  partsIn, offsetMinutes, gapMinutes, observesDst, greatCircleKm,
  estimateFlightMinutes, peakLatitude, humanGap, utcLabel, hm,
} from "./tz";
import { t, type Messages } from "./i18n";

export type RouteFacts = ReturnType<typeof routeFacts>;

/**
 * Everything a route page needs, computed once on the server.
 *
 * The gap is evaluated at "now" so the page always states today's truth, and the
 * page is revalidated often enough that a cached copy never survives a DST switch
 * by more than the revalidate window.
 */
export function routeFacts(from: City, to: City, locale: string, msgs: Messages) {
  const now = new Date();
  const gap = gapMinutes(now, from.tz, to.tz);
  const year = now.getUTCFullYear();

  const units = {
    hour: t(msgs, "unit.hour"), hours: t(msgs, "unit.hours"),
    minute: t(msgs, "unit.minute"), minutes: t(msgs, "unit.minutes"),
  };

  const km = greatCircleKm(from.lat, from.lon, to.lat, to.lon);
  const flightMin = estimateFlightMinutes(km);
  const peak = peakLatitude(from.lat, from.lon, to.lat, to.lon);

  const fromDst = observesDst(from.tz, year);
  const toDst = observesDst(to.tz, year);

  const nf = new Intl.NumberFormat(locale);

  // what time is it in `to` when it is noon in `from`
  const noonTo = (((12 * 60 + gap) % 1440) + 1440) % 1440;
  const noonToLabel = new Intl.DateTimeFormat(locale, {
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, Math.floor(noonTo / 60), noonTo % 60)));

  const dstKey = fromDst && toDst ? "both" : fromDst ? "onlyFrom" : toDst ? "onlyTo" : "neither";

  return {
    gap,
    gapLabel: humanGap(gap, units),
    direction: gap > 0 ? t(msgs, "unit.ahead") : t(msgs, "unit.behind"),
    fromOffset: offsetMinutes(now, from.tz),
    toOffset: offsetMinutes(now, to.tz),
    fromUtc: utcLabel(offsetMinutes(now, from.tz)),
    toUtc: utcLabel(offsetMinutes(now, to.tz)),
    km, kmLabel: nf.format(Math.round(km)),
    flightMin, flightLabel: hm(flightMin),
    peakLat: Math.round(Math.abs(peak)),
    isPolar: Math.abs(peak) > 60,
    fromDst, toDst, dstKey,
    dstNote: t(msgs, `faq.dst.${dstKey}`, { from: from.name, to: to.name }),
    noonToLabel,
    schoolDays: Math.max(1, Math.round(flightMin / 360)),
    /** Hour-by-hour pairs for the static table — indexable text, no JS needed. */
    hourTable: Array.from({ length: 24 }, (_, h) => {
      const other = (((h * 60 + gap) % 1440) + 1440) % 1440;
      const f = (m: number) =>
        new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
          .format(new Date(Date.UTC(2020, 0, 1, Math.floor(m / 60), m % 60)));
      return { from: f(h * 60), to: f(other), rolls: h * 60 + gap >= 1440 || h * 60 + gap < 0 };
    }),
    nowParts: { from: partsIn(now, from.tz), to: partsIn(now, to.tz) },
  };
}
