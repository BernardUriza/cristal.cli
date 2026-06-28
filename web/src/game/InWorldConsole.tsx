import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "./store";
import { GameMode } from "./types";

interface InWorldConsoleProps {
  id: string;
  position: [number, number, number];
}

/**
 * Interactable 3D console object — the analogue of InWorldConsole in Unity.
 * Glows when the player is in range and pulses brighter while active.
 */
export function InWorldConsole({ id, position }: InWorldConsoleProps) {
  const screenRef = useRef<THREE.MeshStandardMaterial>(null);
  const nearbyId = useGame((s) => s.nearbyConsoleId);
  const activeId = useGame((s) => s.activeConsoleId);
  const mode = useGame((s) => s.mode);

  useFrame(({ clock }) => {
    if (!screenRef.current) return;
    const active = activeId === id && mode !== GameMode.Exploration;
    const near = nearbyId === id;
    const base = active ? 2.2 : near ? 1.3 : 0.5;
    const pulse = 0.2 * Math.sin(clock.elapsedTime * 3) + 1;
    screenRef.current.emissiveIntensity = base * pulse;
  });

  return (
    <group position={position}>
      {/* pedestal */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.0, 0.5]} />
        <meshStandardMaterial color="#10130f" roughness={0.7} />
      </mesh>
      {/* screen */}
      <mesh position={[0, 1.25, 0.05]} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.08]} />
        <meshStandardMaterial
          ref={screenRef}
          color="#021a10"
          emissive="#33ff99"
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
