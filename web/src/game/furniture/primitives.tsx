import { RoundedBox } from "@react-three/drei";
import type * as THREE from "three";
import { useFurnitureMaterials } from "./materialsContext";

export function FurnitureBox({
  material,
  position,
  scale,
  rounded = true,
  radius = 0.025,
}: {
  material: THREE.Material;
  position: [number, number, number];
  scale: [number, number, number];
  rounded?: boolean;
  radius?: number;
}) {
  if (rounded) {
    return (
      <RoundedBox
        args={scale}
        radius={Math.min(radius, scale[0] * 0.3, scale[1] * 0.3, scale[2] * 0.3)}
        smoothness={3}
        bevelSegments={2}
        position={position}
        material={material}
        castShadow
        receiveShadow
      />
    );
  }

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function GlowPanel({
  color,
  opacity,
  position,
  rotation = [0, 0, 0],
  size,
}: {
  color: string;
  opacity: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
}) {
  const material = useFurnitureMaterials().glow(color, opacity);
  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
