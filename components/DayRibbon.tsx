"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDaylight, activityEmoji } from "@/lib/activity";
import { t, type Messages } from "@/lib/i18n";

const THUMB = 22, PAD = THUMB / 2;

export default function DayRibbon({
  fromName, toName, gapMin, msgs, locale,
}: { fromName: string; toName: string; gapMin: number; msgs: Messages; locale: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [min, setMin] = useState(480);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth || 640);
    measure();
    // width-only: a phone fires resize whenever the address bar collapses
    let lastW = window.innerWidth;
    const onResize = () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; measure(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const x = useCallback((m: number) => PAD + (m / 1440) * (w - 2 * PAD), [w]);

  const barH = 46, top = 44, gapY = 52;
  const yA = top, yB = top + barH + gapY;
  const H = top + barH + gapY + barH + 34;

  const fmt = (m: number) => {
    const d = new Date(Date.UTC(2020, 0, 1, Math.floor(m / 60), m % 60));
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(d);
  };
  const shortHour = (h: number) => {
    const d = new Date(Date.UTC(2020, 0, 1, h, 0));
    return new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }).format(d);
  };

  /** Blocks sit on each CITY'S OWN hour boundaries, so a :30 zone visibly offsets. */
  const stripe = (y: number, label: string, colour: string, offset: number) => {
    const r = ((offset % 60) + 60) % 60;
    const hourShift = Math.round((offset - r) / 60);
    const nodes: React.ReactNode[] = [];
    for (let k = 0; k <= 24; k++) {
      const start = k * 60 - r, end = start + 60;
      const vs = Math.max(0, start), ve = Math.min(1440, end);
      if (ve - vs <= 0) continue;
      const h = (((k + hourShift) % 24) + 24) % 24;
      const day = isDaylight(h);
      const px = x(vs), pw = Math.max(1, x(ve) - x(vs) - 2);
      nodes.push(
        <rect key={`r${k}`} x={px + 1} y={y} width={pw} height={barH} rx={3}
          fill={day ? colour : "rgba(255,255,255,.07)"}
          opacity={day ? (h >= 10 && h < 16 ? 1 : 0.78) : 1} />,
      );
      if (h % 6 === 0 && ve - vs >= 25) {
        const label2 = start >= 0 ? shortHour(h) : fmt(h * 60 + (vs - start));
        const wide = px + 4 + label2.length * 7 > w;
        nodes.push(
          <text key={`t${k}`} x={wide ? w - 2 : px + 4} y={y + barH + 14}
            fill="var(--muted)" fontSize={11} fontWeight={600}
            textAnchor={wide ? "end" : "start"}>{label2}</text>,
        );
      }
      if ((h === 12 || h === 0) && ve - vs > 40) {
        nodes.push(
          <text key={`s${k}`} x={(px + x(ve)) / 2} y={y + barH / 2 + 6}
            textAnchor="middle" fontSize={16}>{h === 12 ? "☀️" : "🌙"}</text>,
        );
      }
    }
    return (
      <g key={label}>
        <text x={2} y={y - 20} fill="var(--ink2)" fontSize={12.5} fontWeight={700}>{label}</text>
        {nodes}
      </g>
    );
  };

  /* ---- pointer scrubbing: never commit on touch until horizontal intent ---- */
  const drag = useRef({ active: false, startX: 0, committed: false });
  const setFromClientX = (clientX: number) => {
    const el = hostRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const usable = rect.width - 2 * PAD;
    const raw = ((clientX - rect.left - PAD) / usable) * 1440;
    setMin(Math.max(0, Math.min(1440, Math.round(raw / 5) * 5)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, committed: e.pointerType !== "touch" };
    if (drag.current.committed) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setFromClientX(e.clientX);
      e.preventDefault();
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    if (!d.committed) {
      if (Math.abs(e.clientX - d.startX) <= 6) return;   // still might be a scroll
      d.committed = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setFromClientX(e.clientX);
  };
  const endDrag = (e: React.PointerEvent, tap: boolean) => {
    const d = drag.current;
    if (d.active && !d.committed && tap) setFromClientX(e.clientX);
    drag.current = { active: false, startX: 0, committed: false };
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  const m = min % 1440;
  const toMin = (((m + gapMin) % 1440) + 1440) % 1440;
  const rolled = m + gapMin >= 1440;
  const rolledBack = m + gapMin < 0;
  const px = x(min);

  const sentence = t(msgs, "ribbon.at", {
    fromCity: fromName, toCity: toName, fromTime: fmt(m), toTime: fmt(toMin),
  });

  return (
    <div className="ribbonwrap">
      <div ref={hostRef} className="ribbon"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, true)} onPointerCancel={(e) => endDrag(e, false)}>
        <svg viewBox={`0 0 ${w} ${H}`} height={H} width="100%" role="img"
          aria-label={`${fromName} / ${toName}`}>
          {stripe(yA, fromName, "var(--sf)", 0)}
          {stripe(yB, toName, "var(--del)", gapMin)}
          <g transform={`translate(${px},0)`}>
            <line x1={0} x2={0} y1={top - 6} y2={yA + barH + 3} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={0} x2={0} y1={yB - 4} y2={yB + barH + 3} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={0} cy={top - 6} r={6} fill="#fff" />
          </g>
        </svg>
      </div>
      <input className="slider" type="range" min={0} max={1440} step={5} value={min}
        onChange={(e) => setMin(+e.target.value)}
        aria-label={t(msgs, "ribbon.midnightIn", { city: fromName })}
        aria-valuetext={`${fmt(m)} ${fromName}, ${fmt(toMin)} ${toName}`} />
      <div className="scrublab">
        <span>{t(msgs, "ribbon.midnightIn", { city: fromName })}</span>
        <span>{t(msgs, "ribbon.noon")}</span>
        <span>{t(msgs, "ribbon.midnight")}</span>
      </div>
      <p className="bignow" aria-live="polite">
        {sentence}
        {rolled ? ` — ${t(msgs, "ribbon.nextDay")}.` : rolledBack ? ` — ${t(msgs, "ribbon.prevDay")}.` : "."}
        <br />
        <span className="sub">
          {fromName}: {activityEmoji(Math.floor(m / 60), false)} &nbsp;·&nbsp;
          {toName}: {activityEmoji(Math.floor(toMin / 60), false)}
        </span>
      </p>
    </div>
  );
}
