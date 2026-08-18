"use client";

import { useEffect, useState } from "react";
import { getPassport, citiesVisited, PASSPORT_EVENT } from "@/lib/passport";
import { t, type Messages } from "@/lib/i18n";

/** Homepage card: progress + the three most recent stamps, or an invite. */
export default function PassportTeaser({ msgs, locale, totalCities }: {
  msgs: Messages; locale: string; totalCities: number;
}) {
  const [state, setState] = useState<{ visited: number; recent: { from: string; to: string; stars: number }[] } | null>(null);

  useEffect(() => {
    const refresh = () => {
      const p = getPassport();
      const recent = Object.values(p.stamps)
        .sort((a, b) => (a.last < b.last ? 1 : -1))
        .slice(0, 3)
        .map((s) => ({ from: s.from, to: s.to, stars: s.stars }));
      setState({ visited: citiesVisited(p), recent });
    };
    refresh();
    window.addEventListener(PASSPORT_EVENT, refresh);
    return () => window.removeEventListener(PASSPORT_EVENT, refresh);
  }, []);

  const nf = new Intl.NumberFormat(locale);

  return (
    <>
      <h2>🛂 {t(msgs, "passport.title")}</h2>
      {!state || state.visited === 0 ? (
        <p className="note" style={{ marginBottom: 0 }}>{t(msgs, "passport.empty")}</p>
      ) : (
        <>
          <p className="note">
            {t(msgs, "passport.progress", { n: nf.format(state.visited), total: nf.format(totalCities) })}
          </p>
          <div className="stampgrid">
            {state.recent.map((s, i) => (
              <div className="stamp" key={i} style={{ rotate: `${((i * 7) % 5) - 2}deg` }}>
                <div className="stampcities">
                  <b style={{ color: "var(--sf)" }}>{s.from}</b>
                  {" → "}
                  <b style={{ color: "var(--del)" }}>{s.to}</b>
                </div>
                
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
