"use client";

import { useEffect, useRef, useState } from "react";
import FlightArc from "@/components/FlightArc";
import type { CityPoint, GlobeController, GlobeView } from "./GlobeTypes";

/**
 * Client shell around the Cesium Ion globe.
 * FlightArc is only for no-WebGL / saveData / Ion failure — never a Three.js ball.
 */
export default function Globe({
  from, to, outbound = true, replayKey = 0, km, hoursLabel, polar, view = "route",
}: {
  from: CityPoint; to: CityPoint;
  outbound?: boolean; replayKey?: number;
  km: string; hoursLabel: string; polar: string | null;
  view?: GlobeView;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<GlobeController | null>(null);
  const [mode, setMode] = useState<"poster" | "webgl" | "fallback">("poster");

  useEffect(() => {
    const host = hostRef.current;
    const canvasHost = canvasHostRef.current;
    if (!host || !canvasHost) return;

    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) { setMode("fallback"); return; }
    try {
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) { setMode("fallback"); return; }
    } catch { setMode("fallback"); return; }

    let disposed = false;
    const mount = async () => {
      try {
        const { createGlobeScene } = await import("./CesiumGlobe");
        if (disposed) return;
        const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const ctrl = await createGlobeScene(canvasHost, {
          from, to, reducedMotion,
          onFail: () => {
            if (disposed) return;
            ctrlRef.current?.dispose();
            ctrlRef.current = null;
            setMode("fallback");
          },
        });
        if (disposed) { ctrl.dispose(); return; }
        ctrlRef.current = ctrl;
        ctrl.setView(view);
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
        console.error("[globe] Cesium failed:", err);
        if (!disposed) setMode("fallback");
      }
    };
    mount();

    return () => {
      disposed = true;
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
    // Pair is fixed for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { ctrlRef.current?.setDirection(outbound); }, [outbound]);
  useEffect(() => { if (replayKey > 0) ctrlRef.current?.flyOnce(); }, [replayKey]);
  useEffect(() => { ctrlRef.current?.setView(view); }, [view]);

  if (mode === "fallback") {
    return (
      <div className="globewrap inflight-fallback">
        <FlightArc fromName={from.name} toName={to.name} km={km} hoursLabel={hoursLabel} polar={polar} />
      </div>
    );
  }

  return (
    <div className="globewrap" ref={hostRef} aria-hidden="true">
      <div className="globecanvas" ref={canvasHostRef} />
      {mode === "poster" && (
        <div className="globeposter">
          <div className="globeball" />
        </div>
      )}
      <div className="globecap">{"⁨"}{km} · {hoursLabel}{"⁩"}{polar ? ` ${polar}` : ""}</div>
    </div>
  );
}
