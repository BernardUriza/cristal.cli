import * as THREE from "three";
import { paintColumn } from "../../application/facade/column.ts";
import { paintEntablature } from "../../application/facade/entablature.ts";
import { colonnadeCenter, paintArchRing, paintSpandrelWall } from "../../application/facade/wall.ts";
import type { Arch, Colonnade, Column } from "../../domain/architecture/types.ts";
import type { Builder } from "./builder.ts";

const BASE_H = 0.14;
const CAPITAL_H = 0.32;
const WALL_T = 0.3;
const CORNICE_H = 0.16;

function buildColumn(b: Builder, col: Column, floorY: number): void {
  const { x, z, h, r } = col;
  const px = b.opts.pxPerMeter;
  b.mesh(new THREE.BoxGeometry(r * 3.6, BASE_H, r * 3.6), b.mats.gold, [x, floorY + BASE_H / 2, z]);
  b.mesh(new THREE.BoxGeometry(r * 2.8, BASE_H, r * 2.8), b.mats.secondary, [x, floorY + BASE_H * 1.5, z]);
  const shaftY0 = floorY + BASE_H * 2;
  const shaftY1 = h - CAPITAL_H;
  const shaftMat = b.textured({ xMin: x - r, xMax: x + r, yMin: shaftY0, yMax: shaftY1, pxPerMeter: px }, (p) => paintColumn(p, col, floorY), b.mats.primary, 3);
  b.mesh(new THREE.CylinderGeometry(r, r, shaftY1 - shaftY0, 24, 1), shaftMat, [x, (shaftY0 + shaftY1) / 2, z]);
  b.mesh(new THREE.BoxGeometry(r * 3, CAPITAL_H, r * 3), b.mats.secondary, [x, h - CAPITAL_H / 2, z]);
  for (const side of [-1, 1]) {
    b.mesh(new THREE.TorusGeometry(r * 0.28, r * 0.09, 8, 16), b.mats.accent, [x + side * r * 1.1, h - 0.1, z - r * 1.2], [0, 0, 0]);
  }
}

function buildArch(b: Builder, arch: Arch, galleryDepth: number, floorY: number): void {
  const cx = (arch.x0 + arch.x1) / 2;
  const R = arch.r;
  const rIn = R * 0.78;
  const px = b.opts.pxPerMeter;
  const ringMat = b.textured({ xMin: cx - R, xMax: cx + R, yMin: arch.y - R, yMax: arch.y + R, pxPerMeter: px }, (p) => paintArchRing(p, arch), arch.pointed ? b.mats.accent : b.mats.primary);
  ringMat.side = THREE.DoubleSide;
  b.mesh(new THREE.RingGeometry(rIn, R, 32, 1, 0, Math.PI), ringMat, [cx, arch.y, arch.z - WALL_T / 2 - 0.01]);
  b.mesh(new THREE.TorusGeometry((rIn + R) / 2, (R - rIn) / 2, 8, 32, Math.PI), arch.pointed ? b.mats.accent : b.mats.primary, [cx, arch.y, arch.z]);
  for (let k = 1; k <= Math.min(arch.nestedRings, 2); k++) {
    const rk = rIn * (1 - 0.12 * k);
    b.mesh(new THREE.TorusGeometry(rk, R * 0.03, 6, 24, Math.PI), k % 2 ? b.mats.accent : b.mats.ink, [cx, arch.y, arch.z - WALL_T / 2 - 0.02]);
  }
  const sideH = arch.y + rIn - floorY;
  for (const sx of [arch.x0, arch.x1]) {
    b.mesh(new THREE.BoxGeometry(0.2, sideH, galleryDepth), b.mats.wall, [sx, floorY + sideH / 2, arch.z + galleryDepth / 2]);
  }
}

export function buildColonnade3d(b: Builder, col: Colonnade): void {
  const { z, depth, floorY, halfWidth, entablature: e } = col;
  const xc = colonnadeCenter(col);
  const px = b.opts.pxPerMeter;
  const galleryDepth = col.arches[0].gallery[col.arches[0].gallery.length - 1] ?? depth;
  const wallFrame = { xMin: xc - halfWidth, xMax: xc + halfWidth, yMin: floorY, yMax: e.y, pxPerMeter: px };
  const wallMat = b.textured(wallFrame, (p) => paintSpandrelWall(p, col), b.mats.wall);
  const springY = col.arches[0].y;
  const upperH = e.y - springY;
  if (wallMat.map) {
    wallMat.map.repeat.y = upperH / (e.y - floorY);
    wallMat.map.offset.y = 1 - wallMat.map.repeat.y;
  }
  b.mesh(new THREE.BoxGeometry(halfWidth * 2, upperH, WALL_T), wallMat, [xc, springY + upperH / 2, z]);
  const backMat = b.textured(wallFrame, (p) => paintSpandrelWall(p, col), b.mats.wall);
  b.mesh(new THREE.BoxGeometry(halfWidth * 2, e.y - floorY, WALL_T), backMat, [xc, floorY + (e.y - floorY) / 2, z + galleryDepth + WALL_T / 2]);
  for (const a of col.arches) buildArch(b, a, galleryDepth, floorY);
  for (const c of col.columns) buildColumn(b, c, floorY);
  const entH = e.h + CORNICE_H;
  const entMat = b.textured({ xMin: xc - halfWidth - 0.3, xMax: xc + halfWidth + 0.3, yMin: e.y, yMax: e.y + entH, pxPerMeter: px }, (p) => paintEntablature(p, col), b.mats.gold);
  b.mesh(new THREE.BoxGeometry((halfWidth + 0.3) * 2, entH, depth + WALL_T), entMat, [xc, e.y + entH / 2, z + depth / 2]);
}
