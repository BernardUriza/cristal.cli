import * as THREE from "three";
import type { Palette } from "../../config/palettes.ts";
import type { ArtConfig, ShaderPreset } from "../../config/types.ts";
import type { LodConfig } from "../../domain/lod.ts";
import type { Painter } from "../../application/painter.ts";
import { frameSize, texturePainter, type TextureFrame } from "../../application/textureView.ts";
import type { DisplayList } from "../../domain/shapes.ts";
import { paletteMaterials, texturedMaterial, type PaletteMaterials } from "./materials.ts";
import type { TextureFactory } from "./textures.ts";

export type BuildOptions = { preset: ShaderPreset; pxPerMeter: number; textures: TextureFactory; lod: LodConfig };

export type Disposable = { dispose(): void };

export class Builder {
  readonly group = new THREE.Group();
  readonly mats: PaletteMaterials;
  readonly disposables: Disposable[] = [];
  meshes = 0;
  textures = 0;

  constructor(readonly pal: Palette, readonly art: ArtConfig, readonly opts: BuildOptions) {
    this.mats = paletteMaterials(pal);
    this.disposables.push(...Object.values(this.mats));
  }

  mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation?: [number, number, number]): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    if (rotation) m.rotation.set(...rotation);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    this.disposables.push(geometry);
    this.meshes++;
    return m;
  }

  own<T extends THREE.Material>(material: T): T {
    this.disposables.push(material);
    return material;
  }

  painter(frame: TextureFrame): Painter {
    return texturePainter(frame, this.pal, this.art, this.opts.lod);
  }

  textured(frame: TextureFrame, paint: (p: Painter) => DisplayList, fallback: THREE.MeshStandardMaterial, repeatX = 1): THREE.MeshStandardMaterial {
    const { width, height } = frameSize(frame);
    const texture = this.opts.textures(paint(this.painter(frame)), width, height);
    if (!texture) return fallback;
    texture.repeat.x = repeatX;
    this.textures++;
    this.disposables.push(texture);
    return this.own(texturedMaterial(texture, fallback));
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
    this.group.clear();
  }
}
