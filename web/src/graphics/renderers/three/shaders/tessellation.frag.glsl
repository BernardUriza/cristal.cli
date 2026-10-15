uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uPrimary;
uniform vec3 uInk;
uniform float uTile;
uniform float uLine;
uniform float uDiamonds;
uniform float uDiscs;
uniform vec3 uAccent;
uniform int uPattern;
uniform vec3 uLightDir;

#include <fog_pars_fragment>
varying vec3 vWorldPos;
varying vec3 vNormalW;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - (a + ab * t));
}

float meander(vec2 f) {
  float d = 1.0;
  d = min(d, segmentDistance(f, vec2(0.0, 1.0), vec2(0.0, 0.0)));
  d = min(d, segmentDistance(f, vec2(0.0, 0.0), vec2(0.75, 0.0)));
  d = min(d, segmentDistance(f, vec2(0.75, 0.0), vec2(0.75, 0.65)));
  d = min(d, segmentDistance(f, vec2(0.75, 0.65), vec2(0.25, 0.65)));
  d = min(d, segmentDistance(f, vec2(0.25, 0.65), vec2(0.25, 0.33)));
  d = min(d, segmentDistance(f, vec2(0.25, 0.33), vec2(0.5, 0.33)));
  d = min(d, segmentDistance(f, vec2(0.5, 0.33), vec2(0.5, 0.5)));
  d = min(d, segmentDistance(f, vec2(0.5, 0.5), vec2(1.0, 0.5)));
  d = min(d, segmentDistance(f, vec2(1.0, 0.5), vec2(1.0, 1.0)));
  return d;
}

vec3 checker(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float parity = mod(cell.x + cell.y, 2.0);
  vec3 col = mix(uColorA, uColorB, parity);
  float aa = fwidth(p.x) * 1.5;
  if (uDiamonds > 0.5 && parity > 0.5) {
    float d = abs(f.x - 0.5) + abs(f.y - 0.5);
    col = mix(uPrimary, col, smoothstep(0.5 - aa, 0.5 + aa, d));
  }
  if (uDiscs > 0.5 && parity < 0.5) {
    float d = length(f - 0.5);
    col = mix(uAccent, col, smoothstep(0.18 - aa, 0.18 + aa, d));
  }
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  col = mix(uInk, col, smoothstep(uLine - aa, uLine + aa, edge));
  return col;
}

vec3 greca(vec2 p) {
  vec2 f = fract(p);
  float aa = fwidth(p.x) * 1.5;
  float d = meander(f);
  return mix(uInk, uColorB, smoothstep(uLine - aa, uLine + aa, d));
}

void main() {
  vec2 p = vWorldPos.xz / uTile;
  vec3 col = uPattern == 1 ? greca(p) : checker(p);
  float light = 0.55 + 0.45 * max(dot(normalize(vNormalW), normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(col * light, 1.0);
  #include <fog_fragment>
}
