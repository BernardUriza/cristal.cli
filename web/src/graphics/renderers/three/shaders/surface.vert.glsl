#include <fog_pars_vertex>
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying vec3 vNormalW;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vLocalPos = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
