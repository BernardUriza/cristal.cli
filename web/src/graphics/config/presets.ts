import type { ConfigInput } from "./types.ts";

export const PRESETS = {
  sparse: { seed: 4, density: 0.2, complexity: 1, palette: "noche" },
  base: { seed: 7, density: 0.6, complexity: 3 },
  dense: { seed: 23, density: 0.9, complexity: 5 },
  noche: { seed: 7, density: 0.6, complexity: 3, palette: "noche" },
  elevation: { seed: 7, density: 0.6, complexity: 3, tech: { projection: { kind: "elevation" } } },
} as const satisfies Record<string, ConfigInput>;

export type PresetName = keyof typeof PRESETS;

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];

export function presetInput(name: string): ConfigInput {
  if (!(name in PRESETS)) throw new Error(`unknown preset ${name}; known: ${PRESET_NAMES.join(", ")}`);
  return PRESETS[name as PresetName];
}
