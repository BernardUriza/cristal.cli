import * as THREE from "three";
import type { Palette } from "../../config/palettes.ts";
import type { ShaderPreset } from "../../config/types.ts";
import ribbedFrag from "./shaders/ribbed.frag.glsl?raw";
import surfaceVert from "./shaders/surface.vert.glsl?raw";
import tessellationFrag from "./shaders/tessellation.frag.glsl?raw";

const LIGHT_DIR = new THREE.Vector3(0.3, 1, 0.5);

export type PaletteMaterials = Record<"wall" | "primary" | "secondary" | "accent" | "gold" | "deep" | "ink", THREE.MeshStandardMaterial>;

export function paletteMaterials(pal: Palette): PaletteMaterials {
  const make = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
  return { wall: make(pal.wall), primary: make(pal.primary), secondary: make(pal.secondary), accent: make(pal.accent), gold: make(pal.gold, 0.5), deep: make(pal.deep), ink: make(pal.ink) };
}

export function tessellationMaterial(pal: Palette, preset: ShaderPreset, tile: number, diamonds: boolean, discs: boolean): THREE.Material {
  if (preset === "none") return new THREE.MeshStandardMaterial({ color: pal.floorB, roughness: 0.95 });
  return new THREE.ShaderMaterial({
    vertexShader: surfaceVert,
    fragmentShader: tessellationFrag,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uColorA: { value: new THREE.Color(pal.floorA) },
      uColorB: { value: new THREE.Color(pal.floorB) },
      uPrimary: { value: new THREE.Color(pal.primary) },
      uInk: { value: new THREE.Color(pal.ink) },
      uTile: { value: tile },
      uLine: { value: preset === "greca" ? 0.06 : 0.02 },
      uDiamonds: { value: diamonds ? 1 : 0 },
      uDiscs: { value: discs ? 1 : 0 },
      uAccent: { value: new THREE.Color(pal.accent) },
      uPattern: { value: preset === "greca" ? 1 : 0 },
      uLightDir: { value: LIGHT_DIR },
    },
  });
}

export function ribbedMaterial(pal: Palette, ribs: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: surfaceVert,
    fragmentShader: ribbedFrag,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uColorA: { value: new THREE.Color(pal.primary) },
      uColorB: { value: new THREE.Color(pal.accent) },
      uInk: { value: new THREE.Color(pal.ink) },
      uRibs: { value: ribs },
      uLine: { value: 0.06 },
      uLightDir: { value: LIGHT_DIR },
    },
  });
}

export function texturedMaterial(texture: THREE.Texture | null, fallback: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  if (!texture) return fallback;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.05 });
}
