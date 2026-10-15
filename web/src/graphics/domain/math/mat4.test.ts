import { describe, expect, it } from "vitest";
import { at, fromRows, identity, lookAt, multiply, orthographic, perspective, rotationY, shear, transform4, transformPoint, translation } from "./mat4";
import { length } from "./vec3";

const close = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(eps);

describe("mat4", () => {
  it("stores column-major like three.js: fromRows(n11…n44).at(row, col)", () => {
    const m = fromRows(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
    expect(at(m, 0, 1)).toBe(2);
    expect(at(m, 1, 0)).toBe(5);
    expect(at(m, 3, 3)).toBe(16);
    expect(m[1]).toBe(5);
    expect(m[4]).toBe(2);
  });

  it("multiplies in order: translation then rotation applies rotation first to the point", () => {
    const t = translation([1, 0, 0]);
    const r = rotationY(Math.PI / 2);
    const p = transformPoint(multiply(t, r), [0, 0, 1]);
    close(p[0], 2);
    close(p[1], 0);
    close(p[2], 0, 1e-12);
    expect(transformPoint(identity(), [3, 4, 5])).toEqual([3, 4, 5]);
  });

  it("lookAt from +Z toward the origin is a pure translation by −eye", () => {
    const v = lookAt([0, 0, 10], [0, 0, 0], [0, 1, 0]);
    const p = transformPoint(v, [1, 2, 3]);
    close(p[0], 1);
    close(p[1], 2);
    close(p[2], -7);
  });

  it("orthographic maps the box corners onto the NDC cube with z flipped (WebGL)", () => {
    const o = orthographic(-2, 2, -1, 1, 0.5, 10.5);
    expect(transformPoint(o, [-2, -1, -0.5])).toEqual([-1, -1, -1]);
    const far = transformPoint(o, [2, 1, -10.5]);
    close(far[0], 1);
    close(far[1], 1);
    close(far[2], 1);
  });

  it("perspective divides by depth and keeps w = −z", () => {
    const p = perspective(Math.PI / 2, 1, 1, 100);
    const [, , , w] = transform4(p, [0, 0, -5]);
    close(w, 5);
    const q = transformPoint(p, [5, 0, -5]);
    close(q[0], 1);
  });

  it("shear(zx, zy) adds k·z to x and y, the oblique projection of Wikipedia", () => {
    const s = shear(0, 0, 0, 0, 0.5, 0.25);
    expect(transformPoint(s, [0, 0, 2])).toEqual([1, 0.5, 2]);
  });

  it("isometric view foreshortens the three axes equally to √(2/3)", () => {
    const d = 1 / Math.sqrt(3);
    const view = lookAt([d, d, d], [0, 0, 0], [0, 1, 0]);
    const origin = transformPoint(view, [0, 0, 0]);
    for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const) {
      const p = transformPoint(view, axis);
      const dx = p[0] - origin[0];
      const dy = p[1] - origin[1];
      close(Math.hypot(dx, dy), Math.sqrt(2 / 3), 1e-9);
    }
    expect(length([d, d, d])).toBeCloseTo(1, 12);
  });
});
