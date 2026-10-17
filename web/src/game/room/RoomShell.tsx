import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { RoomPressureAtmosphere } from "../RoomPressureController";
import type { Dims } from "./geometry";

export interface RoomShellProps {
  dims: Dims;
  material: THREE.MeshStandardMaterial;
  pressure: RoomPressureAtmosphere;
}

export function RoomShell({ dims, material, pressure }: RoomShellProps) {
  useFrame(({ clock }) => {
    const breath = (Math.sin(clock.elapsedTime * (1.1 + pressure.wallPulse * 2.4)) + 1) / 2;
    material.emissiveIntensity = 0.45 + breath * pressure.wallPulse;
  });

  return (
    <mesh position={[0, dims.h / 2, 0]} material={material}>
      <boxGeometry args={[dims.w, dims.h, dims.d]} />
    </mesh>
  );
}
