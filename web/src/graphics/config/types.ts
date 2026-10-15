import type { LodConfig } from "../domain/lod.ts";
import type { PaletteName } from "./palettes.ts";

export type Symmetry = "bilateral" | "asymmetric";
export type ProjectionKind = "perspective" | "elevation";
export type RenderBackend = "svg" | "canvas" | "three";
export type ShaderPreset = "none" | "checker" | "greca";

export type ArtConfig = {
  seed: number;
  density: number;
  complexity: number;
  anomalyRate: number;
  palette: PaletteName;
  symmetry: Symmetry;
  columns: number | null;
};

export type ProjectionConfig = {
  kind: ProjectionKind;
  horizon: number;
  focal: number;
  camHeight: number;
};

export type TechConfig = {
  width: number;
  height: number;
  projection: ProjectionConfig;
  lod: LodConfig;
  renderBackend: RenderBackend;
  shaderPreset: ShaderPreset;
};

export type CompositionConfig = { art: ArtConfig; tech: TechConfig };

export type ConfigInput = Partial<ArtConfig> & {
  tech?: Partial<Omit<TechConfig, "projection" | "lod">> & {
    projection?: Partial<ProjectionConfig>;
    lod?: Partial<LodConfig>;
  };
};

export const DEFAULT_ART: ArtConfig = {
  seed: 7,
  density: 0.6,
  complexity: 3,
  anomalyRate: 0.5,
  palette: "friedeberg",
  symmetry: "bilateral",
  columns: null,
};

export const DEFAULT_TECH: TechConfig = {
  width: 1200,
  height: 900,
  projection: { kind: "perspective", horizon: 0.55, focal: 0.7, camHeight: 1.7 },
  lod: { detailScale: 1 },
  renderBackend: "svg",
  shaderPreset: "checker",
};
