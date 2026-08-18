/**
 * All three.js code lives in this module, loaded at runtime via import() from
 * Globe.tsx — three must never reach the server bundle or the initial route
 * chunk. Imperative on purpose: the scene structure is fixed, so React has no
 * business in the frame loop.
 *
 * Rotation model: the camera is fixed; one earthGroup (earth + atmosphere +
 * markers + arc + plane) carries all rotation, so nothing can desync from the
 * texture. Orientation = yaw/pitch offsets around a base quaternion that frames
 * both cities; drag, inertia, intro and auto-rotate all just move those offsets.
 */
import * as THREE from "three";
import { latLonToVec3, greatCirclePoints, separationAngle, type Vec3 } from "@/lib/globe-math";
import { subsolarPoint } from "@/lib/solar";
import { EARTH_VERT, EARTH_FRAG, ATMO_VERT, ATMO_FRAG } from "./shaders";

const SF = new THREE.Color("#3987e5");   // origin city — blue, always (invariant 4)
const DEL = new THREE.Color("#c98500");  // destination city — gold, always
const AMBIENT_LOOP_S = 12;
const FLY_ONCE_S = 2.5;

export type GlobeController = {
  setSize(w: number, h: number): void;
  setDirection(outbound: boolean): void;
  flyOnce(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
};

export function createGlobeScene(host: HTMLDivElement, opts: {
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  labels: [HTMLElement, HTMLElement];
  reducedMotion: boolean;
  onFail(): void;
}): GlobeController {
  const disposables: { dispose(): void }[] = [];
  const cleanups: (() => void)[] = [];

  /* ------------------------------ renderer ------------------------------ */
  const cores = navigator.hardwareConcurrency || 4;
  const renderer = new THREE.WebGLRenderer({
    antialias: cores > 4,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cores <= 4 ? 1.25 : 1.75));
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);
  disposables.push(renderer);

  const scene = new THREE.Scene();
  const aVec = latLonToVec3(opts.from.lat, opts.from.lon);
  const bVec = latLonToVec3(opts.to.lat, opts.to.lon);
  const θ = separationAngle(aVec, bVec);
  const camDist = Math.min(3.4, Math.max(2.15, 2.1 + 1.4 * (θ / Math.PI)));
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  camera.position.set(0, 0, camDist);

  /* ------------------------------- stars -------------------------------- */
  const starPos = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) {
    const u = Math.random() * 2 - 1;
    const φ = Math.random() * Math.PI * 2;
    const r = 7 + Math.random() * 4;
    const s = Math.sqrt(1 - u * u);
    starPos[i * 3] = r * s * Math.cos(φ);
    starPos[i * 3 + 1] = r * u;
    starPos[i * 3 + 2] = -Math.abs(r * s * Math.sin(φ)) - 1; // behind the earth
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.7 });
  scene.add(new THREE.Points(starGeo, starMat));
  disposables.push(starGeo, starMat);

  /* ---------------------------- earth group ----------------------------- */
  const group = new THREE.Group();
  scene.add(group);

  const loader = new THREE.TextureLoader();
  let failed = false;
  const fail = () => { if (!failed) { failed = true; opts.onFail(); } };
  const loadTex = (url: string) => {
    const tex = loader.load(url, () => { needsFrame = true; kick(); }, undefined, fail);
    // Deliberately NOT SRGBColorSpace: this ShaderMaterial writes gl_FragColor
    // with no colorspace conversion, so the texture must pass through raw —
    // marking it sRGB would decode on sample and render the earth washed out.
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    disposables.push(tex);
    return tex;
  };
  const sunUniform = new THREE.Vector3(1, 0, 0);
  const earthMat = new THREE.ShaderMaterial({
    vertexShader: EARTH_VERT,
    fragmentShader: EARTH_FRAG,
    uniforms: {
      dayMap: { value: loadTex("/textures/earth-day-2k.webp") },
      nightMap: { value: loadTex("/textures/earth-night-2k.webp") },
      sunDir: { value: sunUniform },
    },
  });
  const earthGeo = new THREE.SphereGeometry(1, 64, 48);
  group.add(new THREE.Mesh(earthGeo, earthMat));
  disposables.push(earthGeo, earthMat);

  const atmoGeo = new THREE.SphereGeometry(1.035, 48, 32);
  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  group.add(new THREE.Mesh(atmoGeo, atmoMat));
  disposables.push(atmoGeo, atmoMat);

  /* ------------------------- markers, arc, plane ------------------------ */
  const markerGeo = new THREE.SphereGeometry(0.016, 12, 8);
  const mkMarker = (v: Vec3, color: THREE.Color) => {
    const mat = new THREE.MeshBasicMaterial({ color });
    const m = new THREE.Mesh(markerGeo, mat);
    m.position.set(v[0] * 1.005, v[1] * 1.005, v[2] * 1.005);
    const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
    const halo = new THREE.Mesh(markerGeo, haloMat);
    halo.scale.setScalar(2.1);
    m.add(halo);
    group.add(m);
    disposables.push(mat, haloMat);
    return m;
  };
  const markerFrom = mkMarker(aVec, SF);
  const markerTo = mkMarker(bVec, DEL);
  disposables.push(markerGeo);

  const SEG = 128;
  const pathAB = greatCirclePoints(aVec, bVec, SEG);
  const mkArcGeo = (pts: Vec3[], c1: THREE.Color, c2: THREE.Color) => {
    const pos = new Float32Array(pts.length * 3);
    const col = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      pos.set(p, i * 3);
      const c = c1.clone().lerp(c2, i / (pts.length - 1));
      col.set([c.r, c.g, c.b], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    disposables.push(g);
    return g;
  };
  const arcMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45 });
  group.add(new THREE.Line(mkArcGeo(pathAB, SF, DEL), arcMat));
  const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
  const trailGeo = mkArcGeo(pathAB, SF, DEL);
  trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeo, trailMat);
  group.add(trail);
  disposables.push(arcMat, trailMat);

  // Paper plane, nose along −z so Matrix4.lookAt orients it directly.
  const planeGeo = new THREE.BufferGeometry();
  planeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    0, 0, -0.030,   -0.020, 0, 0.018,    0, 0.004, 0.010,   // left wing
    0, 0, -0.030,    0, 0.004, 0.010,    0.020, 0, 0.018,   // right wing
    0, 0, -0.030,    0, 0.004, 0.010,    0, -0.010, 0.014,  // keel
  ]), 3));
  planeGeo.computeVertexNormals();
  const planeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  group.add(plane);
  disposables.push(planeGeo, planeMat);

  /* -------------------------- base orientation -------------------------- */
  // Rotate the pair's midpoint to face the camera, from→to reading left→right.
  const A = new THREE.Vector3(...aVec), B = new THREE.Vector3(...bVec);
  const w = A.clone().add(B).normalize();
  if (w.lengthSq() < 1e-9) w.set(0, 0, 1);
  const ab = B.clone().sub(A);
  const u = ab.clone().sub(w.clone().multiplyScalar(ab.dot(w)));
  if (u.lengthSq() < 1e-9) u.set(1, 0, 0); else u.normalize();
  const v = w.clone().cross(u);
  const qBase = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(u, v, w).transpose(),
  );

  let yaw = opts.reducedMotion ? 0 : 2.8;   // intro starts wound 160° away
  let pitch = 0;
  const applyOrientation = () => {
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    group.quaternion.copy(qX).multiply(qY).multiply(qBase);
  };
  applyOrientation();

  /* ----------------------- shared mutable state ------------------------- */
  // Declared before anything below runs at creation time (refreshSun writes
  // needsFrame immediately — declaring these later is a TDZ crash).
  let raf = 0;
  let paused = false;
  let needsFrame = true;
  let last = performance.now();

  let introT = opts.reducedMotion ? 1 : 0;            // 0..1 over the intro sweep
  let planeT = opts.reducedMotion ? 0.5 : 0;          // position along the path
  let flyT = -1;                                      // ≥0 while a one-shot flight runs
  let outbound = true;
  let yawVel = 0;                                     // inertia, rad/s
  let lastInteract = performance.now();
  let dragging = false;

  /* ------------------------------ sun/labels ---------------------------- */
  let localSun = new THREE.Vector3();
  const refreshSun = () => {
    const sp = subsolarPoint(new Date());
    localSun = new THREE.Vector3(...latLonToVec3(sp.lat, sp.lon));
    needsFrame = true;
  };
  refreshSun();
  const sunTimer = setInterval(refreshSun, 60000);
  cleanups.push(() => clearInterval(sunTimer));

  const tmpV = new THREE.Vector3();
  const placeLabel = (marker: THREE.Mesh, el: HTMLElement) => {
    marker.getWorldPosition(tmpV);
    const facing = tmpV.clone().normalize().z;
    tmpV.project(camera);
    el.style.left = `${(tmpV.x * 0.5 + 0.5) * 100}%`;
    el.style.top = `${(-tmpV.y * 0.5 + 0.5) * 100}%`;
    el.style.opacity = facing < 0.12 ? "0" : "1";
  };

  /* ------------------------------ animators ----------------------------- */
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const pathAt = (t: number): Vec3 => {
    const pts = pathAB;
    const f = outbound ? t : 1 - t;
    const i = Math.min(SEG - 1, Math.max(0, Math.floor(f * SEG)));
    const frac = f * SEG - i;
    const p = pts[i], q = pts[i + 1];
    return [p[0] + (q[0] - p[0]) * frac, p[1] + (q[1] - p[1]) * frac, p[2] + (q[2] - p[2]) * frac];
  };

  const placePlane = () => {
    const p = pathAt(planeT);
    const n = pathAt(Math.min(1, planeT + 0.01));
    plane.position.set(p[0], p[1], p[2]);
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(...p), new THREE.Vector3(...n), new THREE.Vector3(...p).normalize(),
    );
    plane.quaternion.setFromRotationMatrix(m);
    // trail behind the plane, in flight direction
    const drawn = Math.floor(planeT * SEG) + 1;
    if (outbound) trailGeo.setDrawRange(0, drawn);
    else trailGeo.setDrawRange(SEG + 1 - drawn, drawn);
  };
  placePlane();

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    let active = false;

    if (introT < 1) {
      introT = Math.min(1, introT + dt / 3.2);
      yaw = 2.8 * (1 - easeOut(introT));
      active = true;
    } else if (!dragging) {
      if (Math.abs(yawVel) > 0.0005) {
        yaw += yawVel * dt;
        yawVel *= Math.pow(0.94, dt * 60);
        active = true;
      } else if (!opts.reducedMotion && now - lastInteract > 2500) {
        // Idle spin fast enough to *see* — a full turn in under a minute,
        // like the Google Earth arrival, not the real planet's 24 h.
        yaw += 0.12 * dt;
        active = true;
      }
    }

    if (flyT >= 0) {
      flyT = Math.min(1, flyT + dt / FLY_ONCE_S);
      planeT = easeOut(flyT);
      placePlane();
      if (flyT >= 1) flyT = -1;
      active = true;
    } else if (!opts.reducedMotion && introT >= 1) {
      planeT = (planeT + dt / AMBIENT_LOOP_S) % 1;
      placePlane();
      active = true;
    }

    applyOrientation();
    sunUniform.copy(localSun).applyQuaternion(group.quaternion);
    renderer.render(scene, camera);
    placeLabel(markerFrom, opts.labels[0]);
    placeLabel(markerTo, opts.labels[1]);

    needsFrame = false;
    if (active || needsFrame) kick();
  };

  const kick = () => {
    if (!paused && !raf && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  /* -------------------------------- drag -------------------------------- */
  const el = renderer.domElement;
  el.style.touchAction = "pan-y";
  el.style.cursor = "grab";
  let px = 0, py = 0, startX = 0, startY = 0, committed = false, activeId = -1;
  const recent: { t: number; x: number }[] = [];

  const onDown = (e: PointerEvent) => {
    activeId = e.pointerId;
    startX = px = e.clientX; startY = py = e.clientY;
    recent.length = 0;
    committed = e.pointerType !== "touch";     // mouse/pen grab immediately
    if (committed) { dragging = true; el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing"; }
    lastInteract = performance.now(); yawVel = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    if (!committed) {
      // Deferred touch commit (invariant-6 pattern): only claim the gesture on
      // clear horizontal intent, so vertical scrolls pass through untouched.
      const tx = e.clientX - startX, ty = e.clientY - startY;
      if (Math.abs(tx) > 6 && Math.abs(tx) > Math.abs(ty)) {
        committed = true; dragging = true;
        el.setPointerCapture(e.pointerId);
      } else if (Math.abs(ty) > 10) {
        activeId = -1;                          // it's a scroll — let go entirely
        return;
      } else return;
    }
    px = e.clientX; py = e.clientY;
    const k = 1 / (renderer.domElement.clientWidth || 400) * 3.2;
    yaw += dx * k;
    pitch = Math.max(-1.05, Math.min(1.05, pitch + dy * k * 0.7));
    recent.push({ t: performance.now(), x: e.clientX });
    while (recent.length > 3) recent.shift();
    lastInteract = performance.now();
    needsFrame = true; kick();
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    if (committed && recent.length >= 2) {
      const a = recent[0], b = recent[recent.length - 1];
      const dtms = b.t - a.t;
      if (dtms > 0) yawVel = ((b.x - a.x) / dtms) * 3.2; // px/ms → rad/s (scaled like drag)
    }
    dragging = false; committed = false; activeId = -1;
    el.style.cursor = "grab";
    lastInteract = performance.now();
    kick();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  cleanups.push(() => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
  });

  const onVis = () => { if (!document.hidden) kick(); };
  document.addEventListener("visibilitychange", onVis);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

  const onLost = (e: Event) => { e.preventDefault(); fail(); };
  el.addEventListener("webglcontextlost", onLost);
  cleanups.push(() => el.removeEventListener("webglcontextlost", onLost));

  kick();

  /* ------------------------------ controller ---------------------------- */
  return {
    setSize(wpx, hpx) {
      renderer.setSize(wpx, hpx, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = wpx / Math.max(1, hpx);
      camera.updateProjectionMatrix();
      needsFrame = true; kick();
    },
    setDirection(v) {
      if (outbound === v) return;
      outbound = v;
      planeT = opts.reducedMotion ? 0.5 : 0;
      placePlane();
      needsFrame = true; kick();
    },
    flyOnce() {
      if (opts.reducedMotion) { planeT = 0.5; placePlane(); needsFrame = true; kick(); return; }
      flyT = 0;
      kick();
    },
    pause() { paused = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resume() { paused = false; needsFrame = true; kick(); },
    dispose() {
      paused = true;
      if (raf) cancelAnimationFrame(raf);
      for (const c of cleanups) c();
      for (const d of disposables) d.dispose();
      renderer.domElement.remove();
    },
  };
}
