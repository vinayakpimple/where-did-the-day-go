"use client";

import { t, type Messages } from "@/lib/i18n";

/** Shown only after the 3-question quiz finishes. Parent mounts this. */
export default function StampBook({
  fromName, toName, msgs, locale, glow = false, nextLabel, onNext,
}: {
  fromName: string; toName: string; msgs: Messages; locale: string;
  glow?: boolean; nextLabel?: string; onNext?: () => void;
}) {
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
