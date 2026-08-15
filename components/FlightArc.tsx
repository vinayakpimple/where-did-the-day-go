"use client";

import { useEffect, useRef, useState } from "react";

export default function FlightArc({
  fromName, toName, km, hoursLabel, polar,
}: { fromName: string; toName: string; km: string; hoursLabel: string; polar: string | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<SVGPathElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const capRef = useRef<SVGTextElement>(null);
  const rafRef = useRef<number>(0);
  const [w, setW] = useState(900);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth || 900);
    measure();
    let lastW = window.innerWidth;
    const onResize = () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; measure(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const H = Math.min(300, Math.max(210, w * 0.3));
  const x1 = w * 0.1, x2 = w * 0.9, yb = H * 0.72, peak = H * 0.2;
  const d = `M${x1},${yb} Q${w / 2},${peak - (yb - peak) * 0.3} ${x2},${yb}`;

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const path = pathRef.current, plane = planeRef.current;
    if (!path || !plane) return;

    // shrink the caption to fit — must be measured after it is in the document
    const cap = capRef.current;
    if (cap?.getComputedTextLength) {
      cap.removeAttribute("font-size");
      const bw = cap.getComputedTextLength();
      if (bw > w - 16) cap.setAttribute("font-size", Math.max(9.5, (13 * (w - 16)) / bw).toFixed(1));
    }

    const total = path.getTotalLength();
    const place = (prog: number) => {
      const p = path.getPointAtLength(prog * total);
      const p2 = path.getPointAtLength(Math.min(total, prog * total + 1));
      const ang = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI;
      plane.setAttribute("transform", `translate(${p.x},${p.y}) rotate(${ang}) scale(0.72)`);
    };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { place(0.5); return; }
    let t0 = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      place(((ts - t0) / 9000) % 1);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [w, d]);

  const stars = [];
  for (let i = 0; i < 46; i++) {
    stars.push(<circle key={i} cx={(i * 97) % w} cy={(i * 53) % (H * 0.55)}
      r={i % 5 === 0 ? 1.5 : 0.9} fill="#fff" opacity={i % 3 === 0 ? 0.5 : 0.25} />);
  }

  return (
    <div ref={hostRef} className="arcwrap">
      <svg viewBox={`0 0 ${w} ${H}`} height={H} width="100%" role="img"
        aria-label={`${fromName} → ${toName}`}>
        <defs>
          <linearGradient id="arcg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sf)" />
            <stop offset="100%" stopColor="var(--del)" />
          </linearGradient>
        </defs>
        {stars}
        <ellipse cx={w / 2} cy={H - 6} rx={w * 0.42} ry={H * 0.3} fill="rgba(120,180,255,.10)" />
        {polar && (
          <text x={w / 2} y={H - 30} textAnchor="middle" fill="var(--muted)" fontSize={12} fontWeight={700}>
            {polar}
          </text>
        )}
        <path d={d} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth={9} strokeLinecap="round" />
        <path ref={pathRef} d={d} fill="none" stroke="url(#arcg)" strokeWidth={3.5}
          strokeLinecap="round" strokeDasharray="1 10" strokeLinejoin="round" />
        {[[x1, "var(--sf)", "start", -6, fromName], [x2, "var(--del)", "end", 6, toName]].map(
          ([cx, col, anch, dx, name], i) => (
            <g key={i}>
              <circle cx={cx as number} cy={yb} r={9} fill={col as string} stroke="#0f1524" strokeWidth={3} />
              <circle cx={cx as number} cy={yb} r={15} fill="none" stroke={col as string} strokeWidth={1.5} opacity={0.45} />
            </g>
          ),
        )}
        <text ref={capRef} x={w / 2} y={peak + 6} textAnchor="middle" fill="var(--ink2)" fontSize={13} fontWeight={700}>
          {"\u2068"}{km} · {hoursLabel}{"\u2069"}
        </text>
        <path ref={planeRef} fill="#fff" stroke="#0a1020" strokeWidth={2.5}
          paintOrder="stroke" strokeLinejoin="round"
          d="M15,0 L-3,-3 L-5,-11 L-9,-11 L-8,-3 L-13,-3 L-15,-7 L-17,-7 L-16,0 L-17,7 L-15,7 L-13,3 L-8,3 L-9,11 L-5,11 L-3,3 Z" />
        {/* names painted last so the plane never sits on top of them */}
        <text x={x1 - 6} y={yb - 18} textAnchor="start" fill="#fff" fontSize={14} fontWeight={750}
          stroke="#0a1020" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{fromName}</text>
        <text x={x2 + 6} y={yb - 18} textAnchor="end" fill="#fff" fontSize={14} fontWeight={750}
          stroke="#0a1020" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{toName}</text>
      </svg>
    </div>
  );
}
