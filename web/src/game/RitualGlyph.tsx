import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "./store";
import { GameMode } from "./types";
import type { SymbolicArchetype } from "./symbolicBus";

export interface GlyphRef {
  id: string;
  position: THREE.Vector3;
  archetype: SymbolicArchetype;
}

interface RitualGlyphProps {
  id: string;
  position: [number, number, number];
  archetype: SymbolicArchetype;
  color: string;
}

export function RitualGlyph({ id, position, archetype, color }: RitualGlyphProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const nearbyId = useGame((s) => s.nearbyGlyphId);
  const mode = useGame((s) => s.mode);
  const lastSymbol = useGame((s) => s.lastSymbol);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const t = clock.elapsedTime;
    mesh.rotation.y = t * 0.6;
    mesh.position.y = 1.3 + Math.sin(t * 1.4) * 0.12;

    const near = nearbyId === id && mode === GameMode.Exploration;
    const invokedAt = lastSymbol?.archetype === archetype ? lastSymbol.at : -Infinity;
    const sinceInvoke = (performance.now() - invokedAt) / 1000;
    const flare = sinceInvoke < 1 ? (1 - sinceInvoke) * 4 : 0;

    const base = near ? 2.4 : 1.0;
    const pulse = 0.25 * Math.sin(t * 3) + 1;
    mat.emissiveIntensity = base * pulse + flare;
  });

  return (
    <group position={position}>
      <pointLight position={[0, 1.3, 0]} intensity={1.4} distance={5} decay={2} color={color} />
      <mesh ref={meshRef} position={[0, 1.3, 0]} castShadow>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          ref={matRef}
          color="#04080a"
          emissive={color}
          emissiveIntensity={1.0}
          roughness={0.2}
          metalness={0.3}
          flatShading
        />
      </mesh>
    </group>
  );
}
