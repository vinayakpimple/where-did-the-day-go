/**
 * Geometry for the 3D globe as plain number arrays. Deliberately does not import
 * three — lib/ stays dependency-free and unit-testable; only GlobeScene turns
 * these into three.js objects.
 */
export type Vec3 = [number, number, number];

const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Lat/lon → position on a sphere of radius r, matching how three's
 * SphereGeometry wraps an equirectangular texture (lon 0 faces +x after the
 * texture seam; see the marker check in the verification list).
 */
export function latLonToVec3(lat: number, lon: number, r = 1): Vec3 {
  const φ = rad(lat), λ = rad(lon);
  return [-r * Math.cos(φ) * Math.cos(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.sin(λ)];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Angle between two points on the unit sphere, in radians. */
export function separationAngle(a: Vec3, b: Vec3): number {
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
}

/**
 * Great-circle path from a to b (unit vectors), lifted off the surface like a
 * flight path. Long routes arc higher, mirroring the taller Bézier the old flat
 * arc used.
 */
export function greatCirclePoints(a: Vec3, b: Vec3, segments = 128): Vec3[] {
  const θ = separationAngle(a, b);
  const sinθ = Math.sin(θ);
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let p: Vec3;
    if (sinθ < 1e-6) {
      p = [...a] as Vec3;
    } else {
      const w1 = Math.sin((1 - t) * θ) / sinθ;
      const w2 = Math.sin(t * θ) / sinθ;
      p = [w1 * a[0] + w2 * b[0], w1 * a[1] + w2 * b[1], w1 * a[2] + w2 * b[2]];
    }
    const lift = 1 + Math.sin(t * Math.PI) * (0.035 + 0.1 * (θ / Math.PI));
    const len = Math.hypot(p[0], p[1], p[2]) || 1;
    pts.push([(p[0] / len) * lift, (p[1] / len) * lift, (p[2] / len) * lift]);
  }
  return pts;
}
