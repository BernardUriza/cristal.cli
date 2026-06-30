import * as THREE from "three";

export type FurnitureTextureProfile =
  | "paintedMetal"
  | "bareMetal"
  | "dustyPlastic"
  | "cardboard"
  | "dirtyCarpet"
  | "smudgedGlass"
  | "agedLaminate";

export interface FurniturePbrTextureSet {
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

const SIZE = 128;
const textureCache = new Map<FurnitureTextureProfile, FurniturePbrTextureSet>();

function hash2(x: number, y: number, seed: number) {
  let n = x * 374761393 + y * 668265263 + seed * 2246822519;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const x1 = a + (b - a) * u;
  const x2 = c + (d - c) * u;
  return x1 + (x2 - x1) * v;
}

function fbm(x: number, y: number, seed: number, octaves = 5) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + i * 19) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
}

function profileSettings(profile: FurnitureTextureProfile) {
  switch (profile) {
    case "paintedMetal":
      return { seed: 11, scale: 5.5, normal: 0.42, roughnessBase: 164, roughnessRange: 62, scratch: 0.16 };
    case "bareMetal":
      return { seed: 23, scale: 8.5, normal: 0.58, roughnessBase: 120, roughnessRange: 82, scratch: 0.3 };
    case "dustyPlastic":
      return { seed: 37, scale: 4.8, normal: 0.36, roughnessBase: 142, roughnessRange: 76, scratch: 0.1 };
    case "cardboard":
      return { seed: 41, scale: 9.5, normal: 0.5, roughnessBase: 178, roughnessRange: 60, scratch: 0.05 };
    case "dirtyCarpet":
      return { seed: 53, scale: 6.2, normal: 0.72, roughnessBase: 205, roughnessRange: 48, scratch: 0.0 };
    case "smudgedGlass":
      return { seed: 67, scale: 3.2, normal: 0.28, roughnessBase: 96, roughnessRange: 112, scratch: 0.2 };
    case "agedLaminate":
      return { seed: 79, scale: 7.0, normal: 0.46, roughnessBase: 150, roughnessRange: 74, scratch: 0.12 };
    default:
      return { seed: 3, scale: 6, normal: 0.4, roughnessBase: 150, roughnessRange: 70, scratch: 0.1 };
  }
}

function makeCanvasTexture(
  profile: FurnitureTextureProfile,
  channel: "normal" | "roughness"
): THREE.Texture {
  if (typeof document === "undefined") {
    const fallback = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat);
    fallback.needsUpdate = true;
    return fallback;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    const fallback = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat);
    fallback.needsUpdate = true;
    return fallback;
  }

  const settings = profileSettings(profile);
  const image = context.createImageData(SIZE, SIZE);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const u = x / SIZE;
      const v = y / SIZE;
      const grain = fbm(u * settings.scale, v * settings.scale, settings.seed);
      const streak = valueNoise(u * 1.7, v * 28, settings.seed + 101);
      const scratch = hash2(Math.floor(u * 48), Math.floor(v * 11), settings.seed + 211) < settings.scratch ? 1 : 0;
      const idx = (y * SIZE + x) * 4;

      if (channel === "normal") {
        const dx = fbm((u + 1 / SIZE) * settings.scale, v * settings.scale, settings.seed) - grain;
        const dy = fbm(u * settings.scale, (v + 1 / SIZE) * settings.scale, settings.seed) - grain;
        image.data[idx] = 128 + Math.round(dx * 255 * settings.normal + scratch * 18);
        image.data[idx + 1] = 128 + Math.round(dy * 255 * settings.normal);
        image.data[idx + 2] = 230;
      } else {
        const roughness = settings.roughnessBase + grain * settings.roughnessRange + streak * 18 + scratch * 36;
        image.data[idx] = Math.max(0, Math.min(255, roughness));
        image.data[idx + 1] = image.data[idx];
        image.data[idx + 2] = image.data[idx];
      }
      image.data[idx + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function getFurniturePbrTextures(profile: FurnitureTextureProfile): FurniturePbrTextureSet {
  const cached = textureCache.get(profile);
  if (cached) return cached;

  const textures = {
    normalMap: makeCanvasTexture(profile, "normal"),
    roughnessMap: makeCanvasTexture(profile, "roughness"),
  };
  textureCache.set(profile, textures);
  return textures;
}
