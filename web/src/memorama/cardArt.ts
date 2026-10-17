import { PALETTE_NAMES } from "../graphics/config/palettes.ts";
import type { ConfigInput } from "../graphics/config/types.ts";
import { mulberry32, pick } from "../shared/rng";

export const CARD_WIDTH = 300;
export const CARD_HEIGHT = 400;

export type ArtSignature = {
  palette: string;
  complexity: number;
  projection: "perspective" | "elevation";
  symmetry: "bilateral" | "asymmetric";
  density: 0 | 1 | 2;
};

export const SIGNATURE_AXES = ["palette", "complexity", "projection", "symmetry", "density"] as const;

export function cardArtInput(artSeed: number): ConfigInput {
  const rng = mulberry32(artSeed ^ 0x5eed);
  return {
    seed: artSeed,
    density: 0.35 + rng() * 0.55,
    complexity: 1 + Math.floor(rng() * 5),
    anomalyRate: rng(),
    palette: pick(rng, PALETTE_NAMES),
    symmetry: rng() < 0.8 ? "bilateral" : "asymmetric",
    tech: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      projection: { kind: rng() < 0.75 ? "perspective" : "elevation", horizon: 0.5 + rng() * 0.15, focal: 0.6 + rng() * 0.3 },
    },
  };
}

export function artSignature(artSeed: number): ArtSignature {
  const input = cardArtInput(artSeed);
  const density = input.density ?? 0.6;
  return {
    palette: String(input.palette),
    complexity: input.complexity ?? 3,
    projection: input.tech?.projection?.kind === "elevation" ? "elevation" : "perspective",
    symmetry: input.symmetry === "asymmetric" ? "asymmetric" : "bilateral",
    density: density < 0.53 ? 0 : density < 0.72 ? 1 : 2,
  };
}

export function signatureDistance(a: ArtSignature, b: ArtSignature): number {
  return SIGNATURE_AXES.filter((axis) => a[axis] !== b[axis]).length;
}
