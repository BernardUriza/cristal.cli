uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uInk;
uniform float uRibs;
uniform float uLine;
uniform vec3 uLightDir;

#include <fog_pars_fragment>
varying vec3 vLocalPos;
varying vec3 vNormalW;

void main() {
  vec3 d = vLocalPos;
  float angle = atan(d.z, d.x) / (2.0 * 3.14159265) + 0.5;
  float rib = angle * uRibs;
  float parity = mod(floor(rib), 2.0);
  float f = fract(rib);
  float edge = min(f, 1.0 - f);
  float aa = fwidth(rib) * 1.5;
  vec3 col = mix(uColorA, uColorB, parity);
  col = mix(uInk, col, smoothstep(uLine - aa, uLine + aa, edge));
  float light = 0.5 + 0.5 * max(dot(normalize(vNormalW), normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(col * light, 1.0);
  #include <fog_fragment>
}
