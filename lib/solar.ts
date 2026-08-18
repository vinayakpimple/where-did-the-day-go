/**
 * Where the sun is directly overhead right now. Declination plus the equation of
 * time gives the subsolar point to about half a degree — plenty for painting a
 * terminator. Pure math, no dependencies, same style as lib/tz.ts.
 */
export function subsolarPoint(d: Date): { lat: number; lon: number } {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const N = (d.getTime() - start) / 86400000; // fractional day of year
  const B = (2 * Math.PI * (N - 81)) / 364;

  const decl = 23.44 * Math.sin((2 * Math.PI * (284 + N)) / 365);
  const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const hoursUTC = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  let lon = -15 * (hoursUTC - 12 + eotMin / 60);
  if (lon <= -180) lon += 360;
  if (lon > 180) lon -= 360;

  return { lat: decl, lon };
}
