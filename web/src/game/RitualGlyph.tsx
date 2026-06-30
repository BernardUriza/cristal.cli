import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "./store";
import { GameMode } from "./types";
import type { SymbolicArchetype } from "./symbolicBus";
import { glyphSvgDataUri } from "./glyphSvg";

const PROJECTION_DURATION = 4;

function GlyphProjection({ archetype, color }: { archetype: SymbolicArchetype; color: string }) {
  const lastSymbol = useGame((s) => s.lastSymbol);
  const spriteRef = useRef<THREE.Sprite>(null);
  const matRef = useRef<THREE.SpriteMaterial>(null);

  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(glyphSvgDataUri(archetype, color));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [archetype, color]);

  useFrame(() => {
    const sprite = spriteRef.current;
    const mat = matRef.current;
    if (!sprite || !mat) return;
    const invokedAt = lastSymbol?.archetype === archetype ? lastSymbol.at : -Infinity;
    const t = (performance.now() - invokedAt) / 1000;
    if (!isFinite(t) || t > PROJECTION_DURATION) {
      sprite.visible = false;
      return;
    }
    sprite.visible = true;
    const fadeIn = Math.min(t / 0.3, 1);
    const fadeOut = t > PROJECTION_DURATION - 1.5 ? Math.max(0, (PROJECTION_DURATION - t) / 1.5) : 1;
    mat.opacity = fadeIn * fadeOut;
    sprite.position.y = 3.0 + Math.sin(t * 2) * 0.07;
    sprite.scale.setScalar(3.2 + t * 0.2);
  });

  return (
    <sprite ref={spriteRef} position={[0, 3.0, 0]} visible={false}>
      <spriteMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

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
  gravity?: number;
}

export function RitualGlyph({ id, position, archetype, color, gravity = 1 }: RitualGlyphProps) {
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
    const flare = sinceInvoke < 0.8 ? (0.8 - sinceInvoke) * 1.6 : 0;

    const base = (near ? 1.8 : 0.9) * gravity;
    const pulse = 0.25 * Math.sin(t * 3) + 1;
    mat.emissiveIntensity = base * pulse + flare;
  });

  return (
    <group position={position}>
      <pointLight position={[0, 1.3, 0]} intensity={1.4 * gravity} distance={5 + (gravity - 1) * 6} decay={2} color={color} />
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
      <GlyphProjection archetype={archetype} color={color} />
    </group>
  );
}
