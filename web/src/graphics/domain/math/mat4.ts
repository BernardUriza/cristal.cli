import { cross, dot, normalize, sub, type Vec3 } from "./vec3.ts";

/** Column-major 4×4, same element order as three.js `Matrix4.elements` / `toArray()`. */
export type Mat4 = readonly number[];

export type Vec4 = readonly [number, number, number, number];

export function identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** Builds from row-major arguments, like three.js `Matrix4.set(n11 … n44)`. */
export function fromRows(
  n11: number, n12: number, n13: number, n14: number,
  n21: number, n22: number, n23: number, n24: number,
  n31: number, n32: number, n33: number, n34: number,
  n41: number, n42: number, n43: number, n44: number,
): Mat4 {
  return [n11, n21, n31, n41, n12, n22, n32, n42, n13, n23, n33, n43, n14, n24, n34, n44];
}

export function at(m: Mat4, row: number, col: number): number {
  return m[col * 4 + row];
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out: number[] = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += at(a, r, k) * at(b, k, c);
      out[c * 4 + r] = s;
    }
  }
  return out;
}

export function transform4(m: Mat4, p: Vec3): Vec4 {
  const [x, y, z] = p;
  return [
    at(m, 0, 0) * x + at(m, 0, 1) * y + at(m, 0, 2) * z + at(m, 0, 3),
    at(m, 1, 0) * x + at(m, 1, 1) * y + at(m, 1, 2) * z + at(m, 1, 3),
    at(m, 2, 0) * x + at(m, 2, 1) * y + at(m, 2, 2) * z + at(m, 2, 3),
    at(m, 3, 0) * x + at(m, 3, 1) * y + at(m, 3, 2) * z + at(m, 3, 3),
  ];
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const [x, y, z, w] = transform4(m, p);
  return [x / w, y / w, z / w];
}

export function translation(t: Vec3): Mat4 {
  return fromRows(1, 0, 0, t[0], 0, 1, 0, t[1], 0, 0, 1, t[2], 0, 0, 0, 1);
}

export function scaling(s: Vec3): Mat4 {
  return fromRows(s[0], 0, 0, 0, 0, s[1], 0, 0, 0, 0, s[2], 0, 0, 0, 0, 1);
}

export function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return fromRows(c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1);
}

/** Same argument order and matrix as three.js r169 `Matrix4.makeShear(xy, xz, yx, yz, zx, zy)`. */
export function shear(xy: number, xz: number, yx: number, yz: number, zx: number, zy: number): Mat4 {
  return fromRows(1, yx, zx, 0, xy, 1, zy, 0, xz, yz, 1, 0, 0, 0, 0, 1);
}

/** World → camera. The camera looks down its −Z, like three.js. */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const zAxis = normalize(sub(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  return fromRows(
    xAxis[0], xAxis[1], xAxis[2], -dot(xAxis, eye),
    yAxis[0], yAxis[1], yAxis[2], -dot(yAxis, eye),
    zAxis[0], zAxis[1], zAxis[2], -dot(zAxis, eye),
    0, 0, 0, 1,
  );
}

/** WebGL clip space (NDC z in [−1, 1]), identical to three.js `Matrix4.makeOrthographic` for WebGL. */
export function orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
  const w = 1 / (right - left);
  const h = 1 / (top - bottom);
  const p = 1 / (far - near);
  return fromRows(2 * w, 0, 0, -(right + left) * w, 0, 2 * h, 0, -(top + bottom) * h, 0, 0, -2 * p, -(far + near) * p, 0, 0, 0, 1);
}

/** Symmetric frustum from vertical field of view (radians), like `PerspectiveCamera.updateProjectionMatrix` for WebGL. */
export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const top = near * Math.tan(fovY / 2);
  const bottom = -top;
  const right = top * aspect;
  const left = -right;
  const x = (2 * near) / (right - left);
  const y = (2 * near) / (top - bottom);
  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);
  const c = -(far + near) / (far - near);
  const d = (-2 * far * near) / (far - near);
  return fromRows(x, 0, a, 0, 0, y, b, 0, 0, 0, c, d, 0, 0, -1, 0);
}

export function approxEqualMat(a: Mat4, b: Mat4, eps = 1e-9): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > eps) return false;
  return true;
}
