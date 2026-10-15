import * as THREE from "three";
import type { DisplayList } from "../../domain/shapes.ts";
import { rasterize } from "../canvas/rasterize.ts";

export type TextureFactory = (list: DisplayList, width: number, height: number) => THREE.Texture | null;

export const canvasTextureFactory: TextureFactory = (list, width, height) => {
  if (typeof document === "undefined") return null;
  const texture = new THREE.CanvasTexture(rasterize(list, width, height));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
};

export const noTextures: TextureFactory = () => null;
