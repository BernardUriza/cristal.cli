import { PALETTE_NAMES } from "../graphics/config/palettes.ts";
import type { ConfigInput } from "../graphics/config/types.ts";
import { mulberry32, pick } from "../graphics/domain/rng.ts";

export const CARD_WIDTH = 300;
export const CARD_HEIGHT = 400;

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
