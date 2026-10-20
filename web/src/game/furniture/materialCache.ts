import * as THREE from "three";

export class FurnitureMaterialCache<K extends string> {
  private readonly standard = new Map<K, THREE.MeshStandardMaterial>();
  private readonly glows = new Map<string, THREE.MeshBasicMaterial>();

  constructor(private readonly create: (key: K) => THREE.MeshStandardMaterial) {}

  material(key: K): THREE.MeshStandardMaterial {
    const cached = this.standard.get(key);
    if (cached) return cached;
    const material = this.create(key);
    this.standard.set(key, material);
    return material;
  }

  glow(color: string, opacity: number): THREE.MeshBasicMaterial {
    const key = `${color}:${opacity}`;
    const cached = this.glows.get(key);
    if (cached) return cached;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    material.name = `backroom-glow-${key}`;
    this.glows.set(key, material);
    return material;
  }

  get size(): number {
    return this.standard.size + this.glows.size;
  }

  dispose(): void {
    for (const material of this.standard.values()) material.dispose();
    for (const material of this.glows.values()) material.dispose();
  }
}
