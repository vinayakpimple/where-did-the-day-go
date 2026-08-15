/**
 * Time-zone engine.
 *
 * Everything here runs identically on the server (Node with full ICU) and in the
 * browser, using only Intl. No tz database is bundled — the platform's own IANA
 * data is the single source of truth, so DST rules stay correct without shipping
 * updates.
 */

export type Parts = {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

/** Wall-clock fields in `tz` at the instant `date`. */
export function partsIn(date: Date, tz: string): Parts {
  const o: Record<string, string> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) {
    if (p.type !== "literal") o[p.type] = p.value;
  }
  return {
    year: +o.year, month: +o.month, day: +o.day,
    // some ICU versions emit "24" for midnight
    hour: +o.hour === 24 ? 0 : +o.hour,
    minute: +o.minute, second: +o.second,
  };
}

/** Minutes `tz` is ahead of UTC at the instant `date` (e.g. +330 for IST). */
export function offsetMinutes(date: Date, tz: string): number {
  const p = partsIn(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Turn a wall-clock time in `tz` into a real instant.
 * Iterates because the offset itself depends on the instant. On a spring-forward
 * gap the requested wall time does not exist; we return the instant the clock
 * actually lands on, and callers can detect it by reading the parts back.
 */
export function zonedToInstant(
  year: number, month: number, day: number,
  hour: number, minute: number, tz: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let ts = naive;
  for (let i = 0; i < 3; i++) ts = naive - offsetMinutes(new Date(ts), tz) * 60000;
  return new Date(ts);
}

/** Minutes `to` is ahead of `from` at `date`. Negative means `to` is behind. */
export function gapMinutes(date: Date, from: string, to: string): number {
  return offsetMinutes(date, to) - offsetMinutes(date, from);
}

/** Does this zone ever change its clocks? Sampled across a year. */
export function observesDst(tz: string, year: number): boolean {
  const base = offsetMinutes(new Date(Date.UTC(year, 0, 15)), tz);
  for (let m = 1; m < 12; m++) {
    if (offsetMinutes(new Date(Date.UTC(year, m, 15)), tz) !== base) return true;
  }
  return false;
}

/** The two offsets a zone uses in `year`, smallest first. One entry if no DST. */
export function offsetRange(tz: string, year: number): number[] {
  const seen = new Set<number>();
  for (let m = 0; m < 12; m++) {
    seen.add(offsetMinutes(new Date(Date.UTC(year, m, 15)), tz));
  }
  return [...seen].sort((a, b) => a - b);
}

/** "UTC+5:30", "UTC−8", "UTC" */
export function utcLabel(mins: number): string {
  if (mins === 0) return "UTC";
  const sign = mins < 0 ? "−" : "+";
  const a = Math.abs(mins);
  const h = Math.floor(a / 60), m = a % 60;
  return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

/** "12 hours 30 minutes" / "12 hours" / "45 minutes" — for prose. */
export function humanGap(mins: number, words: { hour: string; hours: string; minute: string; minutes: string }): string {
  const a = Math.abs(mins);
  const h = Math.floor(a / 60), m = a % 60;
  const hp = h ? `${h} ${h === 1 ? words.hour : words.hours}` : "";
  const mp = m ? `${m} ${m === 1 ? words.minute : words.minutes}` : "";
  return [hp, mp].filter(Boolean).join(" ") || `0 ${words.minutes}`;
}

/** "12½" / "13" / "5¾" — compact, for headlines. */
export function fractionHours(mins: number): string {
  const a = Math.abs(mins);
  const h = Math.floor(a / 60), m = a % 60;
  const frac = m === 30 ? "½" : m === 45 ? "¾" : m === 15 ? "¼" : "";
  if (frac) return `${h}${frac}`;
  return m ? `${h}:${String(m).padStart(2, "0")}` : String(h);
}

/** "5h 30m" */
export function hm(mins: number): string {
  const a = Math.abs(mins);
  return `${Math.floor(a / 60)}h ${String(a % 60).padStart(2, "0")}m`;
}

/* ---------------- great-circle distance & flight estimate ---------------- */

const R_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function greatCircleKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(s));
}

/**
 * Rough nonstop block time in minutes. Cruise ~860 km/h plus a fixed ~40 min of
 * taxi, climb and descent. Deliberately presented as an estimate everywhere.
 */
export function estimateFlightMinutes(km: number): number {
  const mins = 40 + (km / 860) * 60;
  return Math.round(mins / 15) * 15;
}

/** Highest latitude reached on the great circle — how far north/south you fly. */
export function peakLatitude(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const φ1 = rad(aLat), φ2 = rad(bLat), Δλ = rad(bLon - aLon);
  const θ = Math.atan2(
    Math.sin(Δλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ),
  );
  const peak = Math.acos(Math.abs(Math.sin(θ) * Math.cos(φ1)));
  const deg = (peak * 180) / Math.PI;
  // the route only reaches the peak if it lies between the endpoints
  const maxEnd = Math.max(Math.abs(aLat), Math.abs(bLat));
  const signed = aLat + bLat >= 0 ? deg : -deg;
  return Math.abs(signed) < maxEnd ? (aLat + bLat >= 0 ? maxEnd : -maxEnd) : signed;
}

/* ---------------- formatting helpers ---------------- */

export function clock12(hour: number, minute: number, locale: string, tz?: string): string {
  const d = new Date(Date.UTC(2020, 0, 1, hour, minute));
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(d);
}

export function weekdayName(p: Parts, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(p.year, p.month - 1, p.day)));
}

export function dateLabel(p: Parts, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(p.year, p.month - 1, p.day)));
}

export function isWeekend(p: Parts): boolean {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return d === 0 || d === 6;
}
