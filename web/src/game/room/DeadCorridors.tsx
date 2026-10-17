import * as THREE from "three";
import { DOOR_W, DOOR_H } from "./config";
import { doorSlots, type Dims } from "./geometry";

export interface DeadCorridorsProps {
  dims: Dims;
  usedDoors: number;
  count: number;
  color: THREE.Color;
}

export function DeadCorridors({ dims, usedDoors, count, color }: DeadCorridorsProps) {
  const slots = doorSlots(dims).slice(usedDoors, usedDoors + count);
  return (
    <>
      {slots.map((slot, i) => (
        <group key={i} position={slot.position} rotation={[0, slot.rotationY, 0]}>
          <mesh>
            <boxGeometry args={[DOOR_W + 0.18, DOOR_H + 0.18, 0.12]} />
            <meshStandardMaterial color="#030605" emissive={color} emissiveIntensity={0.18} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <planeGeometry args={[DOOR_W, DOOR_H]} />
            <meshBasicMaterial color="#050505" transparent opacity={0.72} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}
