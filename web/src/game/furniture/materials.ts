import * as THREE from "three";
import { getFurniturePbrTextures, type FurnitureTextureProfile } from "../proceduralPbrTextures";

export interface FurnitureMaterialSpec {
  profile: FurnitureTextureProfile;
  normalScale: number;
  params: THREE.MeshStandardMaterialParameters;
}

export const FURNITURE_MATERIALS = {
  deskTop: { profile: "agedLaminate", normalScale: 0.28, params: { color: "#4f453b", roughness: 0.58, metalness: 0.02 } },
  deskLeg: { profile: "paintedMetal", normalScale: 0.22, params: { color: "#3b332c", roughness: 0.5, metalness: 0.28 } },
  chairVinyl: { profile: "dustyPlastic", normalScale: 0.34, params: { color: "#252c2b", roughness: 0.64, metalness: 0.0 } },
  chairBase: { profile: "paintedMetal", normalScale: 0.2, params: { color: "#171b1b", roughness: 0.47, metalness: 0.35 } },
  cabinetPaint: { profile: "paintedMetal", normalScale: 0.32, params: { color: "#737d75", roughness: 0.48, metalness: 0.22 } },
  cabinetDrawer: { profile: "paintedMetal", normalScale: 0.22, params: { color: "#626b64", roughness: 0.52, metalness: 0.18 } },
  cabinetHandle: { profile: "bareMetal", normalScale: 0.16, params: { color: "#c2c8be", roughness: 0.38, metalness: 0.72, envMapIntensity: 0.55 } },
  cardboardA: { profile: "cardboard", normalScale: 0.34, params: { color: "#8f6a45", roughness: 0.92, metalness: 0.0 } },
  cardboardB: { profile: "cardboard", normalScale: 0.32, params: { color: "#a47c52", roughness: 0.88, metalness: 0.0 } },
  serverBody: { profile: "paintedMetal", normalScale: 0.2, params: { color: "#111615", roughness: 0.43, metalness: 0.42 } },
  serverPanel: { profile: "paintedMetal", normalScale: 0.2, params: { color: "#27302d", roughness: 0.5, metalness: 0.3 } },
  extinguisherPaint: { profile: "paintedMetal", normalScale: 0.24, params: { color: "#b51f19", roughness: 0.36, metalness: 0.38, envMapIntensity: 0.5 } },
  darkRubber: { profile: "dustyPlastic", normalScale: 0.2, params: { color: "#161918", roughness: 0.7, metalness: 0.0 } },
  paperLabel: { profile: "cardboard", normalScale: 0.1, params: { color: "#e7e4d7", roughness: 0.9, metalness: 0.0 } },
  exitShell: { profile: "dustyPlastic", normalScale: 0.16, params: { color: "#062813", emissive: "#49ff87", emissiveIntensity: 1.15, roughness: 0.48, metalness: 0.0, toneMapped: false } },
  exitFace: { profile: "dustyPlastic", normalScale: 0.08, params: { color: "#dcffe8", emissive: "#49ff87", emissiveIntensity: 0.9, roughness: 0.42, metalness: 0.0, toneMapped: false } },
  ventPlate: { profile: "bareMetal", normalScale: 0.22, params: { color: "#222927", roughness: 0.45, metalness: 0.72, envMapIntensity: 0.5 } },
  ventSlat: { profile: "bareMetal", normalScale: 0.16, params: { color: "#68716b", roughness: 0.4, metalness: 0.78, envMapIntensity: 0.56 } },
  pipeMetal: { profile: "bareMetal", normalScale: 0.18, params: { color: "#6d7771", roughness: 0.42, metalness: 0.78, envMapIntensity: 0.58 } },
  pipeBracket: { profile: "paintedMetal", normalScale: 0.16, params: { color: "#3a423e", roughness: 0.52, metalness: 0.35 } },
  vendingBody: { profile: "dustyPlastic", normalScale: 0.3, params: { color: "#3a2028", roughness: 0.52, metalness: 0.08 } },
  vendingGlass: { profile: "smudgedGlass", normalScale: 0.16, params: { color: "#111719", emissive: "#c94b5f", emissiveIntensity: 0.5, roughness: 0.22, metalness: 0.0, envMapIntensity: 0.62, toneMapped: false } },
  vendingPanel: { profile: "dustyPlastic", normalScale: 0.18, params: { color: "#101312", roughness: 0.58, metalness: 0.0 } },
  wetCarpet: { profile: "dirtyCarpet", normalScale: 0.55, params: { color: "#102d26", roughness: 1, metalness: 0.0, transparent: true, opacity: 0.72 } },
  monitorPlastic: { profile: "dustyPlastic", normalScale: 0.25, params: { color: "#111414", roughness: 0.62, metalness: 0.0 } },
  monitorGlass: { profile: "smudgedGlass", normalScale: 0.18, params: { color: "#070b0d", emissive: "#7df0ff", emissiveIntensity: 0.22, roughness: 0.3, metalness: 0.0, envMapIntensity: 0.55, toneMapped: false } },
  cartMetal: { profile: "bareMetal", normalScale: 0.18, params: { color: "#68716b", roughness: 0.36, metalness: 0.8, envMapIntensity: 0.58 } },
  fluorescentTube: { profile: "smudgedGlass", normalScale: 0.08, params: { color: "#e5fff0", roughness: 0.18, metalness: 0.0, emissive: "#d8ffe3", emissiveIntensity: 1.4, toneMapped: false } },
  emissiveGreen: { profile: "dustyPlastic", normalScale: 0.08, params: { color: "#46e6a1", emissive: "#46e6a1", emissiveIntensity: 1.6, roughness: 0.36, toneMapped: false } },
  emissiveCyan: { profile: "smudgedGlass", normalScale: 0.1, params: { color: "#7df0ff", emissive: "#7df0ff", emissiveIntensity: 0.22, roughness: 0.34, toneMapped: false } },
} as const satisfies Record<string, FurnitureMaterialSpec>;

export type FurnitureMaterialKey = keyof typeof FURNITURE_MATERIALS;

export function createFurnitureMaterial(key: FurnitureMaterialKey): THREE.MeshStandardMaterial {
  const { profile, normalScale, params }: FurnitureMaterialSpec = FURNITURE_MATERIALS[key];
  const maps = getFurniturePbrTextures(profile);
  const material = new THREE.MeshStandardMaterial({
    ...params,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap,
  });
  material.normalScale.set(normalScale, normalScale);
  material.envMapIntensity = params.envMapIntensity ?? 0.35;
  material.name = `backroom-${key}`;
  return material;
}
