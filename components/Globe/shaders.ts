/** GLSL for the earth and atmosphere. Plain strings — no loader plumbing. */

export const EARTH_VERT = /* glsl */ `
varying vec3 vWorldNormal;
varying vec2 vUv;
void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const EARTH_FRAG = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDir;
varying vec3 vWorldNormal;
varying vec2 vUv;
void main() {
  float sun = dot(normalize(vWorldNormal), sunDir);
  float dayness = smoothstep(-0.12, 0.18, sun);
  vec3 day = texture2D(dayMap, vUv).rgb * (0.35 + 0.75 * max(sun, 0.0));
  vec3 night = texture2D(nightMap, vUv).rgb * 1.35;
  gl_FragColor = vec4(mix(night, day, dayness), 1.0);
}
`;

export const ATMO_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const ATMO_FRAG = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = pow(1.0 - abs(dot(vView, normalize(vNormal))), 3.0);
  gl_FragColor = vec4(vec3(0.35, 0.55, 1.0) * rim, rim);
}
`;
