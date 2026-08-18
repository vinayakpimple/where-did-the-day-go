"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPassport, getQuizStats, citiesVisited, PASSPORT_EVENT, type Passport, type QuizStats,
} from "@/lib/passport";
import { t, type Messages } from "@/lib/i18n";

/**
 * Topbar 🛂 badge + the passport drawer. Everything hydrates post-mount from
 * localStorage; the server renders an empty badge.
 */
export default function PassportButton({ msgs, locale, totalCities }: {
  msgs: Messages; locale: string; totalCities: number;
}) {
  const [open, setOpen] = useState(false);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [quiz, setQuiz] = useState<QuizStats | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(() => {
    setPassport(getPassport());
    setQuiz(getQuizStats());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(PASSPORT_EVENT, refresh);
    return () => window.removeEventListener(PASSPORT_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus();
    };
  }, [open]);

  const nf = new Intl.NumberFormat(locale);
  const visited = passport ? citiesVisited(passport) : 0;
  const stamps = passport
    ? Object.entries(passport.stamps).sort((a, b) => (a[1].last < b[1].last ? 1 : -1))
    : [];

  return (
    <>
      <button ref={openerRef} className="passbtn" onClick={() => setOpen(true)}
        aria-expanded={open} aria-label={t(msgs, "passport.button")}>
        🛂{visited > 0 && <span className="passcount">{nf.format(visited)}</span>}
      </button>

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label={t(msgs, "passport.title")}>
            <div className="drawerhead">
              <h2>🛂 {t(msgs, "passport.title")}</h2>
              <button ref={closeRef} className="tab" onClick={() => setOpen(false)}>
                {t(msgs, "passport.close")}
              </button>
            </div>
            <p className="note">
              {t(msgs, "passport.progress", { n: nf.format(visited), total: nf.format(totalCities) })}
            </p>
            {stamps.length === 0 ? (
              <p className="note">{t(msgs, "passport.empty")}</p>
            ) : (
              <div className="stampgrid">
                {stamps.map(([slug, s], i) => (
                  <div className="stamp" key={slug} style={{ rotate: `${((i * 7) % 5) - 2}deg` }}>
                    <div className="stampcities">
                      <b style={{ color: "var(--sf)" }}>{s.from}</b>
                      {" → "}
                      <b style={{ color: "var(--del)" }}>{s.to}</b>
                    </div>
                    <div className="stampmeta">
                      {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" })
                        .format(new Date(`${s.first}T12:00:00`))}
                      {" · "}
                      {t(msgs, "passport.stampVisits", { n: nf.format(s.visits) })}
                      {s.stars > 0 && <span className="stampstars"> {"⭐".repeat(s.stars)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {quiz && quiz.answered > 0 && (
              <p className="note">
                {t(msgs, "passport.quizLine", { correct: nf.format(quiz.correct), answered: nf.format(quiz.answered) })}
              </p>
            )}
            <p className="note passprivacy">{t(msgs, "passport.privacy")}</p>
          </div>
        </>
      )}
    </>
  );
}
