import { PRESETS } from "./presets.ts";
import type { ConfigInput } from "./types.ts";

export const GAME_COMPOSITION: ConfigInput = { ...PRESETS.base, tech: { shaderPreset: "checker", lod: { detailScale: 1 } } };

export const TEMPLE_PLACEMENT = { position: [0, -0.02, -8] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number], viewDistance: 22 };
