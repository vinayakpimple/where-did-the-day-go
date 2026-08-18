"use client";

/**
 * Small analog face for quiz options — a simplified cousin of the ClockFace in
 * LiveClocks. Decorative only (the button's aria-label carries the time), and
 * pinned LTR so the hands don't mirror under dir="rtl".
 */
export default function MiniClock({ minutes }: { minutes: number }) {
  const h = Math.floor(minutes / 60) % 12;
  const m = minutes % 60;
  const hourA = ((h + m / 60) / 12) * 2 * Math.PI - Math.PI / 2;
  const minA = (m / 60) * 2 * Math.PI - Math.PI / 2;

  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    ticks.push(
      <line key={i}
        x1={50 + 42 * Math.cos(a)} y1={50 + 42 * Math.sin(a)}
        x2={50 + 46 * Math.cos(a)} y2={50 + 46 * Math.sin(a)}
        stroke="currentColor" strokeWidth={i % 3 === 0 ? 3 : 1.5} opacity={0.55} />,
    );
  }

  return (
    <svg className="face2" viewBox="0 0 100 100" aria-hidden="true" style={{ direction: "ltr" }}>
      <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,.05)" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      {ticks}
      <line x1="50" y1="50" x2={50 + 24 * Math.cos(hourA)} y2={50 + 24 * Math.sin(hourA)}
        stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2={50 + 36 * Math.cos(minA)} y2={50 + 36 * Math.sin(minA)}
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <circle cx="50" cy="50" r="3.5" fill="currentColor" />
    </svg>
  );
}
