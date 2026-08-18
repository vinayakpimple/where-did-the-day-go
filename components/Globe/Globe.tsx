"use client";

import { useEffect, useRef, useState } from "react";
import FlightArc from "@/components/FlightArc";
import type { CityPoint, GlobeController } from "./GlobeTypes";

/**
 * Client shell around the Cesium globe. Server-renders a CSS poster inside a
 * fixed-height wrapper (zero CLS), then upgrades to WebGL only when the globe
 * nears the viewport. No WebGL / saveData / any failure → FlightArc.
 */
export default function Globe({
  from, to, outbound = true, replayKey = 0, km, hoursLabel, polar, flyLabel,
}: {
  from: CityPoint; to: CityPoint;
  outbound?: boolean; replayKey?: number;
  km: string; hoursLabel: string; polar: string | null;
  flyLabel?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<GlobeController | null>(null);
  const [mode, setMode] = useState<"poster" | "webgl" | "fallback">("poster");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) { setMode("fallback"); return; }
    try {
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) { setMode("fallback"); return; }
    } catch { setMode("fallback"); return; }

    let disposed = false;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      try {
        const { createGlobeScene } = await import("./CesiumGlobe");
        if (disposed) return;
        const canvasHost = canvasHostRef.current!;
        const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const ctrl = await createGlobeScene(canvasHost, {
          from, to, reducedMotion,
          onFail: () => { ctrlRef.current?.dispose(); ctrlRef.current = null; setMode("fallback"); },
        });
        if (disposed) { ctrl.dispose(); return; }
        ctrlRef.current = ctrl;
        const size = () => ctrl.setSize(host.clientWidth, host.clientHeight);
        size();
        const ro = new ResizeObserver(size);
        ro.observe(host);
        const vis = new IntersectionObserver(
          (es) => (es.some((e) => e.isIntersecting) ? ctrl.resume() : ctrl.pause()),
          { threshold: 0 },
        );
        vis.observe(host);
        const oldDispose = ctrl.dispose.bind(ctrl);
        ctrl.dispose = () => { ro.disconnect(); vis.disconnect(); oldDispose(); };
        setMode("webgl");
      } catch (err) {
        console.error("[globe] Cesium failed, falling back to flat arc:", err);
        if (!disposed) setMode("fallback");
      }
    }, { rootMargin: "600px 0px" });
    io.observe(host);

    return () => {
      disposed = true;
      io.disconnect();
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
    // The pair is fixed for this mount — parents remount via key on pair change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { ctrlRef.current?.setDirection(outbound); }, [outbound]);
  useEffect(() => { if (replayKey > 0) ctrlRef.current?.flyOnce(); }, [replayKey]);

  if (mode === "fallback") {
    return (
      <div className="globewrap">
        <FlightArc fromName={from.name} toName={to.name} km={km} hoursLabel={hoursLabel} polar={polar} />
      </div>
    );
  }

  return (
    <div className="globewrap" ref={hostRef}>
      <div className="globecanvas" ref={canvasHostRef} />
      {mode === "poster" && (
        <div className="globeposter">
          <div className="globeball" />
          <span className="globedot" style={{ background: "var(--sf)", insetInlineStart: "38%", top: "42%" }} />
          <span className="globedot" style={{ background: "var(--del)", insetInlineStart: "60%", top: "36%" }} />
        </div>
      )}
      {mode === "webgl" && flyLabel && (
        <button type="button" className="globefly" onClick={() => ctrlRef.current?.flyOnce()}>
          {flyLabel}
        </button>
      )}
      <div className="globecap">{"⁨"}{km} · {hoursLabel}{"⁩"}{polar ? ` ${polar}` : ""}</div>
    </div>
  );
}
