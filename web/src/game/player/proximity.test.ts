import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { INTERACT_RANGE, findNearestId } from "./proximity";

const item = (id: string, x: number, z: number) => ({
  id,
  position: new THREE.Vector3(x, 0, z),
});

describe("findNearestId", () => {
  it("returns null when nothing is within range", () => {
    const items = [item("a", 10, 0), item("b", 0, 10)];
    expect(findNearestId(items, new THREE.Vector3(0, 0, 0))).toBeNull();
  });

  it("returns the closest of several candidates in range", () => {
    const items = [item("far", 2, 0), item("near", 1, 0)];
    expect(findNearestId(items, new THREE.Vector3(0, 0, 0))).toBe("near");
  });

  it("treats the range as exclusive", () => {
    const items = [item("edge", INTERACT_RANGE, 0)];
    expect(findNearestId(items, new THREE.Vector3(0, 0, 0))).toBeNull();
  });

  it("honours a custom range", () => {
    const items = [item("a", 5, 0)];
    expect(findNearestId(items, new THREE.Vector3(0, 0, 0), 6)).toBe("a");
  });
});
