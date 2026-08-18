/**
 * CesiumJS globe — loaded only via dynamic import() from Globe.tsx so the
 * engine never lands in the server bundle or the initial route chunk.
 *
 * No Cesium ion token. Default imagery is Esri World Imagery (satellite) on
 * the ellipsoid. Sun lighting uses Cesium's built-in sun. Optional Google
 * Photorealistic 3D Tiles load only when NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY is set.
 */
import type { Cartesian3 } from "cesium";
import type { CityPoint, GlobeController } from "./GlobeTypes";

const SF = "#3987e5";
const DEL = "#c98500";
const ESRI_IMAGERY =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type CesiumNS = typeof import("cesium");

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
  viewer: import("cesium").Viewer,
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

export async function createGlobeScene(
  host: HTMLDivElement,
  opts: {
    from: CityPoint;
    to: CityPoint;
    reducedMotion: boolean;
    onFail(): void;
  },
): Promise<GlobeController> {
  (globalThis as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium/";

  const Cesium = await import("cesium");
  await import("cesium/Build/Cesium/Widgets/widgets.css");

  const creditHost = document.createElement("div");
  creditHost.className = "globecredit";
  host.appendChild(creditHost);

  const baseLayer = new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url: ESRI_IMAGERY,
      credit: new Cesium.Credit("Esri, Maxar, Earthstar Geographics", false),
      maximumLevel: 19,
    }),
  );

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
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayer,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    msaaSamples: 1,
  });

  const scene = viewer.scene;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.sun.show = true;
  scene.moon.show = true;
  scene.skyAtmosphere.show = true;
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

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY;
  if (googleKey) {
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleKey}`,
      );
      scene.primitives.add(tileset);
      sscc.minimumZoomDistance = 80;
    } catch (err) {
      console.warn("[globe] Google 3D tiles unavailable, staying on satellite imagery", err);
    }
  }

  // Blue is always the page-origin city, gold the destination (invariant 4).
  addCity(Cesium, viewer, opts.from, SF);
  addCity(Cesium, viewer, opts.to, DEL);

  const pathAB = geodesicPath(Cesium, opts.from, opts.to);
  const pathBA = pathAB.slice().reverse();
  let outbound = true;
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

  frameRoute(opts.reducedMotion ? 0 : 1.8);
  paintTrail(opts.reducedMotion ? 0.5 : 0.02);

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
      clearInterval(sunTimer);
      document.removeEventListener("visibilitychange", onVis);
      scene.canvas.removeEventListener("webglcontextlost", onLost);
      try { viewer.destroy(); } catch { /* already torn down */ }
      creditHost.remove();
    },
  };
}
