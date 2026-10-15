import * as THREE from "three";
import type { Palette } from "../../config/palettes.ts";
import type { ArtConfig } from "../../config/types.ts";
import type { Architecture } from "../../domain/architecture/types.ts";
import { Builder, type BuildOptions } from "./builder.ts";
import { buildColonnade3d } from "./buildColonnade3d.ts";
import { buildDome3d } from "./buildDome3d.ts";
import { tessellationMaterial } from "./materials.ts";

export type TempleBuild = { group: THREE.Group; dispose: () => void; meshes: number; textures: number };

export function buildTemple(arch: Architecture, pal: Palette, art: ArtConfig, opts: BuildOptions): TempleBuild {
  const b = new Builder(pal, art, opts);
  const { floor, platform } = arch;
  const floorMat = b.own(tessellationMaterial(pal, opts.preset, floor.tile, floor.diamonds, floor.discs));
  const floorMesh = b.mesh(new THREE.PlaneGeometry(floor.xMax - floor.xMin, floor.zMax - floor.zMin), floorMat, [(floor.xMin + floor.xMax) / 2, 0, (floor.zMin + floor.zMax) / 2], [-Math.PI / 2, 0, 0]);
  floorMesh.castShadow = false;
  for (let i = 0; i < platform.steps; i++) {
    const hw = platform.halfWidth + (platform.steps - 1 - i) * 0.6;
    const d = platform.depth + (platform.steps - 1 - i) * 0.6;
    const y0 = i * platform.stepHeight;
    b.mesh(new THREE.BoxGeometry(hw * 2, platform.stepHeight, d), i % 2 === 0 ? b.mats.secondary : b.mats.gold, [0, y0 + platform.stepHeight / 2, platform.z + d / 2]);
  }
  for (const col of [arch.main, ...arch.wings]) {
    buildColonnade3d(b, col);
    buildDome3d(b, col);
  }
  return { group: b.group, dispose: () => b.dispose(), meshes: b.meshes, textures: b.textures };
}
