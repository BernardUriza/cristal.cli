import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "./store";
import { GameMode } from "./types";

interface InWorldConsoleProps {
  id: string;
  label: string;
  accent: string;
  position: [number, number, number];
}

function makeConsoleLabel(label: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.font = "700 34px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Interactable 3D console object — the analogue of InWorldConsole in Unity.
 * Glows when the player is in range and pulses brighter while active.
 */
export function InWorldConsole({ id, label, accent, position }: InWorldConsoleProps) {
  const screenRef = useRef<THREE.MeshStandardMaterial>(null);
  const nearbyId = useGame((s) => s.nearbyConsoleId);
  const activeId = useGame((s) => s.activeConsoleId);
  const mode = useGame((s) => s.mode);
  const labelTex = useMemo(() => makeConsoleLabel(label, accent), [label, accent]);

  useEffect(() => () => labelTex.dispose(), [labelTex]);

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
      <pointLight position={[0, 1.3, 0]} intensity={1.2} distance={4} decay={2} color={accent} />
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
          emissive={accent}
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 1.9, 0.06]}>
        <planeGeometry args={[1.35, 0.5]} />
        <meshBasicMaterial map={labelTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
