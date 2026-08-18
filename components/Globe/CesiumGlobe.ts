/**
 * CesiumJS globe — loaded only via dynamic import() from Globe.tsx.
 *
 * Engine + workers + widgets.css come from the public jsDelivr CDN.
 * Ion token is NEXT_PUBLIC_CESIUM_ION_TOKEN. Imagery + terrain are Ion.
 * Photoreal 3D tiles load only if that asset is on the Ion account.
 */
import { CESIUM_BASE_URL } from "@/lib/cesium-cdn";
import type { CityPoint, GlobeController } from "./GlobeTypes";

const SF = "#3987e5";
const DEL = "#c98500";
const ESRI_IMAGERY =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const OSM_IMAGERY = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type CesiumNS = any;
type Cartesian3 = any;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const hit = document.querySelector<HTMLScriptElement>(`script[data-cesium-engine="1"]`);
    if (hit && (window as unknown as { Cesium?: CesiumNS }).Cesium) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.cesiumEngine = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function ensureWidgetsCss(base: string) {
  if (document.querySelector('link[data-cesium-widgets="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${base}Widgets/widgets.css`;
  link.dataset.cesiumWidgets = "1";
  document.head.appendChild(link);
}

async function loadCesium(): Promise<CesiumNS> {
  const w = window as unknown as { CESIUM_BASE_URL?: string; Cesium?: CesiumNS };
  w.CESIUM_BASE_URL = CESIUM_BASE_URL;
  ensureWidgetsCss(CESIUM_BASE_URL);
  if (w.Cesium) return w.Cesium;
  await loadScript(`${CESIUM_BASE_URL}Cesium.js`);
  if (!w.Cesium) throw new Error("Cesium.js loaded without window.Cesium");
  return w.Cesium;
}

function geodesicPath(Cesium: CesiumNS, a: CityPoint, b: CityPoint, segments = 128): Cartesian3[] {
  const start = Cesium.Cartographic.fromDegrees(a.lon, a.lat);
  const end = Cesium.Cartographic.fromDegrees(b.lon, b.lat);
  const geo = new Cesium.EllipsoidGeodesic(start, end);
  const liftPeak = Math.min(420_000, Math.max(36_000, geo.surfaceDistance * 0.045));
  const pts: Cartesian3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const c = geo.interpolateUsingFraction(t);
    c.height = Math.sin(t * Math.PI) * liftPeak;
    pts.push(Cesium.Cartographic.toCartesian(c));
  }
  return pts;
}

function headingToward(Cesium: CesiumNS, from: Cartesian3, to: Cartesian3): number {
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(from);
  const inv = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
  const local = Cesium.Matrix4.multiplyByPoint(inv, to, new Cesium.Cartesian3());
  return Math.atan2(local.x, local.y);
}

function addCity(
  Cesium: CesiumNS,
  viewer: any,
  city: CityPoint,
  hex: string,
) {
  viewer.entities.add({
    name: city.name,
    position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat),
    point: {
      pixelSize: 14,
      color: Cesium.Color.fromCssColorString(hex),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: city.name,
      font: "700 14px system-ui, sans-serif",
      fillColor: Cesium.Color.fromCssColorString(hex),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -16),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

function makeLayer(
  Cesium: CesiumNS,
  url: string,
  credit: string,
) {
  return new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url,
      credit: new Cesium.Credit(credit, false),
      maximumLevel: 19,
    }),
  );
}

function useOsmIfEsriFails(Cesium: CesiumNS, viewer: any) {
  const layer = viewer.imageryLayers.get(0);
  const provider = layer?.imageryProvider as { errorEvent?: { addEventListener(fn: () => void): void } } | undefined;
  if (!provider?.errorEvent) return;
  let swapped = false;
  provider.errorEvent.addEventListener(() => {
    if (swapped) return;
    swapped = true;
    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.add(makeLayer(Cesium, OSM_IMAGERY, "© OpenStreetMap"));
      viewer.scene.requestRender();
    } catch (err) {
      console.warn("[globe] OSM imagery fallback failed", err);
    }
  });
}

export async function createGlobeScene(
  host: HTMLDivElement,
  opts: {
    from: CityPoint;
    to: CityPoint;
    reducedMotion: boolean;
    onFail(): void;
  },
): Promise<GlobeController> {
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.minHeight = "280px";

  const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (!token) {
    throw new Error("NEXT_PUBLIC_CESIUM_ION_TOKEN is missing");
  }

  const Cesium = await loadCesium();
  Cesium.Ion.defaultAccessToken = token;

  const wrap = host.closest(".globewrap") ?? host.parentElement ?? host;
  const creditHost = document.createElement("div");
  creditHost.className = "globecredit";
  wrap.appendChild(creditHost);

  let imagery;
  let terrain;
  try {
    imagery = await Cesium.createWorldImageryAsync();
    terrain = await Cesium.createWorldTerrainAsync({
      requestVertexNormals: true,
      requestWaterMask: true,
    });
  } catch (err) {
    console.error("[globe] Ion imagery/terrain rejected the token", err);
    throw err;
  }

  const viewer = new Cesium.Viewer(host, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    creditContainer: creditHost,
    terrainProvider: terrain,
    baseLayer: new Cesium.ImageryLayer(imagery),
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    msaaSamples: 1,
  });

  const scene = viewer.scene;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = true;
  scene.globe.showGroundAtmosphere = true;
  if (scene.sun) scene.sun.show = true;
  if (scene.moon) scene.moon.show = true;
  if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
  scene.backgroundColor = Cesium.Color.fromCssColorString("#080c17");
  viewer.clock.currentTime = Cesium.JulianDate.now();
  viewer.clock.shouldAnimate = false;

  const sscc = scene.screenSpaceCameraController;
  sscc.enableRotate = true;
  sscc.enableTranslate = true;
  sscc.enableZoom = true;
  sscc.enableTilt = true;
  sscc.enableLook = false;
  sscc.minimumZoomDistance = 12_000;
  sscc.maximumZoomDistance = 4.2e7;
  // Pinch / right-drag zoom only. Wheel on the canvas must not steal the
  // document scroll (and the pair page no longer has a leftover strip to jump).
  sscc.zoomEventTypes = [
    Cesium.CameraEventType.PINCH,
    Cesium.CameraEventType.RIGHT_DRAG,
  ];

  try {
    const tileset = await Cesium.createGooglePhotorealistic3DTileset();
    scene.primitives.add(tileset);
    sscc.minimumZoomDistance = 80;
  } catch (err) {
    console.warn(
      "[globe] Photoreal 3D tiles not on this Ion account. In ion.cesium.com open Asset Depot, add Google Photorealistic 3D Tiles, and give the token assets:read + geocode. Staying on Ion imagery + terrain.",
      err,
    );
  }

  addCity(Cesium, viewer, opts.from, SF);
  addCity(Cesium, viewer, opts.to, DEL);

  const pathAB = geodesicPath(Cesium, opts.from, opts.to);
  const pathBA = pathAB.slice().reverse();
  let outbound = true;
  let view: import("./GlobeTypes").GlobeView = "route";
  let planeT = 0.02;
  const routePositions = () => (outbound ? pathAB : pathBA);

  const route = viewer.entities.add({
    polyline: {
      positions: pathAB,
      width: 4,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.18,
        color: Cesium.Color.WHITE.withAlpha(0.95),
      }),
    },
  });

  let trailPts: Cartesian3[] = [pathAB[0]];
  const trail = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => trailPts, false),
      width: 5,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.28,
        color: Cesium.Color.fromCssColorString(SF),
      }),
    },
  });

  const plane = viewer.entities.add({
    position: pathAB[0],
    point: {
      pixelSize: 10,
      color: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString(SF),
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  const originHex = () => (outbound ? SF : DEL);

  const paintTrail = (t: number) => {
    planeT = t;
    const pts = routePositions();
    const n = Math.max(2, Math.floor(t * (pts.length - 1)) + 1);
    trailPts = pts.slice(0, n);
    const pos = pts[Math.min(pts.length - 1, n - 1)];
    plane.position = new Cesium.ConstantPositionProperty(pos);
    if (plane.point) {
      plane.point.outlineColor = new Cesium.ConstantProperty(
        Cesium.Color.fromCssColorString(originHex()),
      );
    }
    if (trail.polyline) {
      trail.polyline.material = new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.28,
        color: Cesium.Color.fromCssColorString(originHex()),
      });
    }
    scene.requestRender();
  };

  const frameRoute = (duration: number) => {
    const bs = Cesium.BoundingSphere.fromPoints(pathAB);
    viewer.camera.flyToBoundingSphere(bs, {
      offset: new Cesium.HeadingPitchRange(0.15, -0.62, bs.radius * 2.35),
      duration,
      complete: () => scene.requestRender(),
    });
  };

  const midLon = (() => {
    const a = opts.from.lon, b = opts.to.lon;
    let d = ((b - a + 540) % 360) - 180;
    return a + d / 2;
  })();
  const midLat = (opts.from.lat + opts.to.lat) / 2;

  const frameDayNight = (duration: number) => {
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(midLon, midLat, 26_000_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      duration,
      complete: () => scene.requestRender(),
    });
  };

  const chase = () => {
    const pts = routePositions();
    const t = Math.min(0.98, Math.max(0.02, planeT));
    const idx = t * (pts.length - 1);
    const i0 = Math.min(pts.length - 2, Math.floor(idx));
    const frac = idx - i0;
    const pos = Cesium.Cartesian3.lerp(pts[i0], pts[i0 + 1], frac, new Cesium.Cartesian3());
    const ahead = pts[Math.min(pts.length - 1, i0 + 3)];
    viewer.camera.lookAt(
      pos,
      new Cesium.HeadingPitchRange(
        headingToward(Cesium, pos, ahead),
        Cesium.Math.toRadians(-28),
        380_000,
      ),
    );
    scene.requestRender();
  };

  const applyView = (v: import("./GlobeTypes").GlobeView, duration: number) => {
    view = v;
    if (v === "follow") {
      chase();
      return;
    }
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    if (v === "daynight") frameDayNight(duration);
    else frameRoute(duration);
  };

  planeT = opts.reducedMotion ? 0.5 : 0.02;
  frameRoute(opts.reducedMotion ? 0 : 1.8);
  paintTrail(planeT);

  let flyRaf = 0;
  let flying = false;

  const stopFly = () => {
    flying = false;
    if (flyRaf) {
      cancelAnimationFrame(flyRaf);
      flyRaf = 0;
    }
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  };

  const flyOnce = () => {
    if (opts.reducedMotion) {
      paintTrail(1);
      frameRoute(0);
      return;
    }
    stopFly();
    flying = true;
    const pts = routePositions();
    const origin = outbound ? opts.from : opts.to;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(origin.lon, origin.lat, 1_200_000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
      duration: 1.1,
      complete: () => {
        const t0 = performance.now();
        const dur = 7200;
        const step = (now: number) => {
          if (!flying) return;
          const u = Math.min(1, (now - t0) / dur);
          const ease = 1 - (1 - u) ** 3;
          const idx = ease * (pts.length - 1);
          const i0 = Math.min(pts.length - 2, Math.floor(idx));
          const frac = idx - i0;
          const pos = Cesium.Cartesian3.lerp(pts[i0], pts[i0 + 1], frac, new Cesium.Cartesian3());
          const ahead = pts[Math.min(pts.length - 1, i0 + 3)];
          paintTrail(ease);
          viewer.camera.lookAt(
            pos,
            new Cesium.HeadingPitchRange(
              headingToward(Cesium, pos, ahead),
              Cesium.Math.toRadians(-28),
              420_000 + (1 - ease) * 900_000,
            ),
          );
          scene.requestRender();
          if (u < 1) flyRaf = requestAnimationFrame(step);
          else {
            stopFly();
            frameRoute(1.4);
          }
        };
        flyRaf = requestAnimationFrame(step);
      },
    });
  };

  viewer.screenSpaceEventHandler.setInputAction(
    () => stopFly(),
    Cesium.ScreenSpaceEventType.LEFT_DOWN,
  );
  viewer.screenSpaceEventHandler.setInputAction(
    () => stopFly(),
    Cesium.ScreenSpaceEventType.PINCH_START,
  );

  const sunTimer = setInterval(() => {
    viewer.clock.currentTime = Cesium.JulianDate.now();
    scene.requestRender();
  }, 60_000);

  let loopRaf = 0;
  let lastLoop = performance.now();
  const loop = (now: number) => {
    loopRaf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - lastLoop) / 1000);
    lastLoop = now;
    if (opts.reducedMotion || flying) {
      if (view === "follow") chase();
      return;
    }
    planeT = (planeT + dt / 12) % 1;
    paintTrail(planeT);
    if (view === "follow") chase();
  };
  loopRaf = requestAnimationFrame(loop);

  const onLost = (e: Event) => {
    e.preventDefault();
    opts.onFail();
  };
  scene.canvas.addEventListener("webglcontextlost", onLost);

  const onVis = () => {
    if (!document.hidden) scene.requestRender();
  };
  document.addEventListener("visibilitychange", onVis);

  return {
    setSize() {
      viewer.resize();
      scene.requestRender();
    },
    setDirection(v) {
      if (outbound === v) return;
      outbound = v;
      if (route.polyline) {
        route.polyline.positions = new Cesium.ConstantProperty(routePositions());
      }
      paintTrail(0.02);
      frameRoute(1.2);
    },
    setView(v) {
      applyView(v, opts.reducedMotion ? 0 : 1.15);
    },
    flyOnce,
    pause() {
      viewer.useDefaultRenderLoop = false;
    },
    resume() {
      viewer.useDefaultRenderLoop = true;
      scene.requestRender();
    },
    dispose() {
      stopFly();
      if (loopRaf) cancelAnimationFrame(loopRaf);
      clearInterval(sunTimer);
      document.removeEventListener("visibilitychange", onVis);
      scene.canvas.removeEventListener("webglcontextlost", onLost);
      try { viewer.destroy(); } catch { /* already torn down */ }
      creditHost.remove();
    },
  };
}
