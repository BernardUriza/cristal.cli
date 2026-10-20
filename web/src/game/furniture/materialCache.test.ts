import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FurnitureMaterialCache } from "./materialCache";

describe("FurnitureMaterialCache", () => {
  it("shares one material per key and per glow inside a mount", () => {
    const cache = new FurnitureMaterialCache<"a" | "b">(() => new THREE.MeshStandardMaterial());
    expect(cache.material("a")).toBe(cache.material("a"));
    expect(cache.material("a")).not.toBe(cache.material("b"));
    expect(cache.glow("#fff", 0.1)).toBe(cache.glow("#fff", 0.1));
    expect(cache.size).toBe(3);
  });

  it("disposes every material it created and none of another mount's", () => {
    const disposed: string[] = [];
    const make = (key: string) => {
      const material = new THREE.MeshStandardMaterial();
      material.name = key;
      material.addEventListener("dispose", () => disposed.push(material.name));
      return material;
    };
    const first = new FurnitureMaterialCache<string>(make);
    const second = new FurnitureMaterialCache<string>(make);
    first.material("desk");
    first.glow("#0f0", 0.2).addEventListener("dispose", () => disposed.push("glow"));
    second.material("chair");
    first.dispose();
    expect(disposed.sort()).toEqual(["desk", "glow"]);
    expect(first.material("desk")).not.toBe(second.material("desk"));
  });
});
