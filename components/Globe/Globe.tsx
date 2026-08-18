"use client";

import { useEffect, useRef, useState } from "react";
import FlightArc from "@/components/FlightArc";
import type { CityPoint, GlobeController } from "./GlobeTypes";

type Mode = "poster" | "webgl" | "nowebgl" | "error";

/**
 * Client shell around the Cesium globe.
 * FlightArc is ONLY for no-WebGL / saveData — never for a Cesium exception.
 */
export default function Globe({
  from, to, outbound = true, replayKey = 0, km, hoursLabel, polar, flyLabel,
  loadingLabel = "The Earth is loading…",
  failedLabel = "The Earth didn't load. Try again.",
  retryLabel = "Try again",
}: {
  from: CityPoint; to: CityPoint;
  outbound?: boolean; replayKey?: number;
  km: string; hoursLabel: string; polar: string | null;
  flyLabel?: string;
  loadingLabel?: string;
  failedLabel?: string;
  retryLabel?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<GlobeController | null>(null);
  const [mode, setMode] = useState<Mode>("poster");
  const [boot, setBoot] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) { setMode("nowebgl"); return; }
    try {
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) { setMode("nowebgl"); return; }
    } catch { setMode("nowebgl"); return; }

    let disposed = false;
    const canvasHost = canvasHostRef.current;
    if (!canvasHost) return;

    const mount = async (attempt: number) => {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
      canvasHost.replaceChildren();
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
            setMode("error");
          },
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
        console.error("[globe] Cesium failed:", err);
        if (disposed) return;
        if (attempt < 1) {
          setMode("error");
          await new Promise((r) => setTimeout(r, 600));
          if (!disposed) await mount(1);
        } else {
          setMode("error");
        }
      }
    };

    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      void mount(0);
    }, { rootMargin: "600px 0px" });
    io.observe(host);

    return () => {
      disposed = true;
      io.disconnect();
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
    // boot increments on manual retry; the pair is fixed for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot]);

  useEffect(() => { ctrlRef.current?.setDirection(outbound); }, [outbound]);
  useEffect(() => { if (replayKey > 0) ctrlRef.current?.flyOnce(); }, [replayKey]);

  if (mode === "nowebgl") {
    return (
      <div className="globewrap">
        <FlightArc fromName={from.name} toName={to.name} km={km} hoursLabel={hoursLabel} polar={polar} />
      </div>
    );
  }

  return (
    <div className="globewrap" ref={hostRef}>
      <div className="globecanvas" ref={canvasHostRef} />
      {(mode === "poster" || mode === "error") && (
        <div className="globeposter">
          <div className="globeball" />
          <span className="globedot" style={{ background: "var(--sf)", insetInlineStart: "38%", top: "42%" }} />
          <span className="globedot" style={{ background: "var(--del)", insetInlineStart: "60%", top: "36%" }} />
        </div>
      )}
      {mode === "poster" && <p className="globestatus">{loadingLabel}</p>}
      {mode === "error" && (
        <div className="globestatus globestatus-fail">
          <p>{failedLabel}</p>
          <button type="button" className="globefly" onClick={() => { setMode("poster"); setBoot((n) => n + 1); }}>
            {retryLabel}
          </button>
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
