import * as THREE from "three";
import { greca } from "../../domain/motifs/bands.ts";
import { inks } from "../../domain/motifs/ornament.ts";
import type { Colonnade } from "../../domain/architecture/types.ts";
import type { Builder } from "./builder.ts";
import { ribbedMaterial } from "./materials.ts";

export function buildDome3d(b: Builder, col: Colonnade): void {
  const dome = col.dome;
  if (!dome) return;
  const { pal } = b;
  const { x, z } = { x: dome.x, z: col.z + col.depth / 2 };
  let R = dome.r;
  let baseY = dome.y;
  const drumH = R * 0.32;
  const px = b.opts.pxPerMeter;
  const drumMat = b.textured({ xMin: 0, xMax: 2 * Math.PI * R, yMin: 0, yMax: drumH, pxPerMeter: px }, (p) => [
    { kind: "rect", x: 0, y: 0, w: 2 * Math.PI * R * px, h: drumH * px, style: { fill: pal.secondary } },
    ...greca(0, 0, 2 * Math.PI * R * px, drumH * 0.3 * px, Math.max(4, dome.ribs) * 3, { ink: inks(pal.ink, pal.secondary, pal.secondary, pal.accent), sw: 1, level: 1, shows: p.lod.shows }),
  ], b.mats.secondary);
  b.mesh(new THREE.CylinderGeometry(R, R, drumH, 32, 1), drumMat, [x, baseY + drumH / 2, z]);
  baseY += drumH;
  for (let t = 0; t < dome.tiers; t++) {
    b.mesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), b.own(ribbedMaterial(pal, dome.ribs)), [x, baseY, z]);
    const lanternH = R * 0.22;
    b.mesh(new THREE.BoxGeometry(R * 0.36, lanternH, R * 0.36), b.mats.gold, [x, baseY + R + lanternH / 2, z]);
    baseY += R + lanternH;
    R *= 0.42;
  }
  b.mesh(new THREE.CylinderGeometry(0.03, 0.03, R * 1.6, 6), b.mats.ink, [x, baseY + R * 0.8, z]);
  b.mesh(new THREE.OctahedronGeometry(R * 0.5, 0), b.mats.accent, [x, baseY + R * 1.9, z]);
}
