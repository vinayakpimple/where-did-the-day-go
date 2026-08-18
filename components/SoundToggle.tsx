"use client";

import { useEffect, useState } from "react";
import { loadPref, setEnabled } from "@/lib/sound";

/**
 * The one place sound is switched on. Renders muted during SSR and first paint,
 * then hydrates the stored preference — avoids a hydration mismatch and keeps
 * the default silent.
 */
export default function SoundToggle({ onLabel, offLabel }: { onLabel: string; offLabel: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(loadPref()); }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setEnabled(next); // inside the click — the AudioContext may be created here
  };

  return (
    <button className="soundbtn" onClick={toggle} aria-pressed={on}
      aria-label={on ? onLabel : offLabel} title={on ? onLabel : offLabel}>
      <span aria-hidden="true">{on ? "🔊" : "🔇"}</span>
      <span className="ctrllabel">{on ? onLabel : offLabel}</span>
    </button>
  );
}
