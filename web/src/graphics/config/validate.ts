import { PALETTE_NAMES } from "./palettes.ts";
import { DEFAULT_ART, DEFAULT_TECH, type CompositionConfig, type ConfigInput } from "./types.ts";

const BACKENDS = ["svg", "canvas", "three"] as const;
const SHADERS = ["none", "checker", "greca"] as const;
const SYMMETRIES = ["bilateral", "asymmetric"] as const;
const PROJECTIONS = ["perspective", "elevation"] as const;

export class ConfigError extends Error {}

function finite(name: string, value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ConfigError(`${name} must be a finite number, got ${String(value)}`);
  return value;
}

function unit(name: string, value: number): number {
  return Math.min(1, Math.max(0, finite(name, value)));
}

function oneOf<T extends string>(name: string, value: string, allowed: readonly T[]): T {
  if (!(allowed as readonly string[]).includes(value)) throw new ConfigError(`${name} must be one of ${allowed.join(", ")}, got ${value}`);
  return value as T;
}

export function resolveConfig(input: ConfigInput = {}): CompositionConfig {
  const { tech: techInput = {}, ...artInput } = input;
  const art = { ...DEFAULT_ART, ...artInput };
  const tech = {
    ...DEFAULT_TECH,
    ...techInput,
    projection: { ...DEFAULT_TECH.projection, ...techInput.projection },
    lod: { ...DEFAULT_TECH.lod, ...techInput.lod },
  };
  const columns = art.columns === null ? null : Math.round(finite("columns", art.columns));
  if (columns !== null && (columns < 3 || columns % 2 === 0)) throw new ConfigError(`columns must be an odd number >= 3, got ${columns}`);
  return {
    art: {
      seed: Math.round(finite("seed", art.seed)),
      density: unit("density", art.density),
      complexity: Math.min(5, Math.max(1, Math.round(finite("complexity", art.complexity)))),
      anomalyRate: unit("anomalyRate", art.anomalyRate),
      palette: oneOf("palette", art.palette, PALETTE_NAMES),
      symmetry: oneOf("symmetry", art.symmetry, SYMMETRIES),
      columns,
    },
    tech: {
      width: Math.max(1, finite("width", tech.width)),
      height: Math.max(1, finite("height", tech.height)),
      projection: {
        kind: oneOf("projection.kind", tech.projection.kind, PROJECTIONS),
        horizon: unit("projection.horizon", tech.projection.horizon),
        focal: Math.max(0.05, finite("projection.focal", tech.projection.focal)),
        camHeight: finite("projection.camHeight", tech.projection.camHeight),
      },
      lod: { detailScale: Math.max(0, finite("lod.detailScale", tech.lod.detailScale)) },
      renderBackend: oneOf("renderBackend", tech.renderBackend, BACKENDS),
      shaderPreset: oneOf("shaderPreset", tech.shaderPreset, SHADERS),
    },
  };
}
