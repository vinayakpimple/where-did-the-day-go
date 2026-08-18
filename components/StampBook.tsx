"use client";

import { useEffect, useState } from "react";
import { getPassport, PASSPORT_EVENT } from "@/lib/passport";
import { t, type Messages } from "@/lib/i18n";

/** Shown after the first correct quiz answer on this pair. */
export default function StampBook({
  slug, fromName, toName, msgs, locale, glow = false, nextLabel, onNext,
}: {
  slug: string; fromName: string; toName: string; msgs: Messages; locale: string;
  glow?: boolean; nextLabel?: string; onNext?: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const check = () => setReady(Boolean(getPassport().stamps[slug]));
    check();
    window.addEventListener(PASSPORT_EVENT, check);
    return () => window.removeEventListener(PASSPORT_EVENT, check);
  }, [slug]);
  if (!ready) return null;
  return (
    <div className="stampbook" aria-live="polite" data-glow={glow || undefined}>
      <p className="playcap">{t(msgs, "quiz.stamped")}</p>
      <div className="stamp" style={{ rotate: "-2deg" }}>
        <div className="stampcities">
          <b style={{ color: "var(--sf)" }}>{fromName}</b>
          {" → "}
          <b style={{ color: "var(--del)" }}>{toName}</b>
        </div>
        <div className="stampmeta">
          {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date())}
        </div>
      </div>
      {nextLabel && onNext && (
        <button type="button" className="hud-go hud-go-dock" data-glow="true" onClick={onNext}>
          {nextLabel}
        </button>
      )}
    </div>
  );
}
