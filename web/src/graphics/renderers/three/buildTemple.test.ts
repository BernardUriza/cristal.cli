import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { composeArchitecture } from "../../application/compose";
import { PALETTES } from "../../config/palettes";
import { resolveConfig } from "../../config/validate";
import { buildTemple } from "./buildTemple";
import { noTextures } from "./textures";

function fakeTextures() {
  const made: THREE.Texture[] = [];
  const factory = () => {
    const t = new THREE.Texture();
    made.push(t);
    return t;
  };
  return { factory, made };
}

describe("buildTemple", () => {
  const cfg = resolveConfig({ seed: 7 });
  const arch = composeArchitecture(cfg);

  it("turns the architecture into meshes deterministically, one colonnade per wing plus main", () => {
    const a = buildTemple(arch, PALETTES.friedeberg, cfg.art, { preset: "checker", pxPerMeter: 8, textures: noTextures, lod: cfg.tech.lod });
    const b = buildTemple(arch, PALETTES.friedeberg, cfg.art, { preset: "checker", pxPerMeter: 8, textures: noTextures, lod: cfg.tech.lod });
    expect(a.meshes).toBe(b.meshes);
    expect(a.group.children.length).toBe(a.meshes);
    const columns = [arch.main, ...arch.wings].reduce((n, c) => n + c.columns.length, 0);
    expect(a.meshes).toBeGreaterThan(columns * 5);
    const bounds = new THREE.Box3().setFromObject(a.group);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(bounds.max.y).toBeGreaterThan(arch.main.columns[0].h);
    expect(bounds.min.z).toBeGreaterThanOrEqual(arch.floor.zMin - 1e-6);
    a.dispose();
    b.dispose();
  });

  it("paints one texture per shaft, arch ring, wall and entablature, and disposes every GPU resource", () => {
    const { factory, made } = fakeTextures();
    const disposedGeometries: number[] = [];
    const build = buildTemple(arch, PALETTES.noche, cfg.art, { preset: "greca", pxPerMeter: 4, textures: factory, lod: cfg.tech.lod });
    build.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.addEventListener("dispose", () => disposedGeometries.push(1));
    });
    const colonnades = [arch.main, ...arch.wings];
    const expected = colonnades.reduce((n, c) => n + c.columns.length + c.arches.length + 2 + 1 + (c.dome ? 1 : 0), 0);
    expect(build.textures).toBe(expected);
    expect(made.length).toBe(expected);
    const disposedTextures: number[] = [];
    made.forEach((t) => t.addEventListener("dispose", () => disposedTextures.push(1)));
    build.dispose();
    expect(disposedTextures.length).toBe(expected);
    expect(disposedGeometries.length).toBe(build.meshes);
    expect(build.group.children.length).toBe(0);
  });
});
