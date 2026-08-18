"use client";

import { useEffect, useState } from "react";
import { partsIn } from "@/lib/tz";

type CityLite = { name: string; tz: string };

export default function ClockPills({
  from, to, locale,
}: { from: CityLite; to: CityLite; locale: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (tz: string) => {
    if (!now) return "··:··";
    const p = partsIn(now, tz);
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric", minute: "2-digit", timeZone: "UTC",
    }).format(new Date(Date.UTC(2020, 0, 1, p.hour, p.minute)));
  };

  return (
    <div className="hud-clocks">
      <span className="clockpill clockpill-from">
        <b>{from.name}</b> {fmt(from.tz)}
      </span>
      <span className="clockpill clockpill-to">
        <b>{to.name}</b> {fmt(to.tz)}
      </span>
    </div>
  );
}
