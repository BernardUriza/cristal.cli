import type { ArtConfig } from "../../config/types.ts";
import { chance, indexBelow, pick, type Rng } from "../../../shared/rng";
import type { Arch, Capital, Colonnade, Column, ShaftScheme, Window } from "./types.ts";

export type ColonnadeSpec = {
  xCenter: number;
  columns: number;
  spacing: number;
  z: number;
  h: number;
  floorY: number;
  withDome: boolean;
};

function shaftScheme(art: ArtConfig, twisted: boolean): ShaftScheme {
  if (twisted) return { kind: "helix", turns: 2 + art.complexity };
  return { kind: "banded", bands: 2 + art.complexity * 2, flutes: 1 + Math.round(art.density * 4), dottedChevrons: art.density > 0.6 };
}

function capital(art: ArtConfig): Capital {
  return { voluteLevel: art.complexity >= 3 ? 2 : 1, rosette: art.complexity >= 3 };
}

function archSpec(art: ArtConfig, pointed: boolean): Pick<Arch, "voussoirs" | "galleryVoussoirs" | "nestedRings" | "ribs" | "detailLevel"> {
  return {
    voussoirs: 7 + 2 * art.complexity,
    galleryVoussoirs: 5 + art.complexity,
    nestedRings: pointed ? 3 + art.complexity : Math.max(0, art.complexity - 2),
    ribs: 6 + art.complexity * 2,
    detailLevel: art.complexity >= 3 ? 3 : 2,
  };
}

export function buildColonnade(art: ArtConfig, rng: Rng, spec: ColonnadeSpec): Colonnade {
  const { xCenter, columns: nCols, spacing, z, h, floorY, withDome } = spec;
  const r = spacing * 0.125;
  const half = ((nCols - 1) / 2) * spacing;
  const twistedAt = chance(rng, art.anomalyRate) ? indexBelow(rng, nCols) : -1;
  const pointedAt = chance(rng, art.anomalyRate) ? indexBelow(rng, nCols - 1) : -1;
  const columns: Column[] = [];
  for (let i = 0; i < nCols; i++) {
    columns.push({ x: xCenter - half + i * spacing, z, h, r, shaft: shaftScheme(art, i === twistedAt), capital: capital(art) });
  }
  const archR = spacing / 2 - r;
  const gallery = Array.from({ length: Math.min(art.complexity, 4) }, (_, k) => (k + 1) * spacing * 1.1);
  const arches: Arch[] = [];
  for (let i = 0; i < nCols - 1; i++) {
    const pointed = i === pointedAt;
    arches.push({ x0: columns[i].x + r, x1: columns[i + 1].x - r, z, y: h, r: archR, pointed, gallery, ...archSpec(art, pointed) });
  }
  const crown = h + archR;
  const winR = spacing * 0.16;
  const nWin = nCols * 2 - 1;
  const starAt = chance(rng, art.anomalyRate) ? indexBelow(rng, nWin) : -1;
  const windows: Window[] = [];
  for (let i = 0; i < nWin; i++) {
    windows.push({ x: xCenter - half + (i + 0.5) * ((half * 2) / nWin), z, y: crown + 0.35, r: winR, star: i === starAt, mullion: art.complexity >= 4 });
  }
  const entY = crown + 0.35 + winR * 2 + 0.3;
  const entH = spacing * 0.28;
  const flipped = chance(rng, art.anomalyRate) ? indexBelow(rng, nCols * 2 + 1) : -1;
  const ribs = withDome ? pick(rng, [8, 12, 16]) : 0;
  return {
    z,
    depth: spacing * 0.6,
    floorY,
    halfWidth: half + spacing * 0.42,
    fanRays: 4 + art.complexity,
    columns,
    arches,
    windows,
    entablature: { y: entY, h: entH, triglyphs: nCols * 2 + 1, flipped, rosetteLevel: art.complexity >= 3 ? 2 : 1 },
    dome: withDome
      ? { x: xCenter, y: entY + entH, r: spacing * 0.8, ribs, tiers: Math.min(art.complexity, 2), windows: Math.max(3, Math.round(ribs / 2)), detailLevel: art.complexity >= 3 ? 2 : 1 }
      : null,
  };
}
