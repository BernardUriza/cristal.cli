import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, fakeExitForRoom } from "../store";
import { playCross, playAlarm } from "../audio";
import type { RoomPressureAtmosphere } from "../RoomPressureController";
import type { SafeExit } from "../SafeExitResolver";
import type { DoorSpec } from "./geometry";
import { makeLabelTexture } from "./textures";
import { DOOR_W, DOOR_H } from "./config";

export interface DoorProps {
  spec: DoorSpec;
  color: THREE.Color;
  active: boolean;
  pressure: RoomPressureAtmosphere;
  safeExit: SafeExit | null;
}

export function crossDoor(index: number): void {
  const { nearbyExit, room } = useGame.getState();
  if (nearbyExit !== index) return;
  if (room && index === fakeExitForRoom(room)) playAlarm();
  else playCross();
  useGame.getState().takeExit(index);
}

export function Door({ spec, color, active, pressure, safeExit }: DoorProps) {
  const frameRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const spiritRef = useRef<THREE.Group>(null);
  const labelTex = useMemo(() => makeLabelTexture(spec.label), [spec.label]);
  useEffect(() => () => labelTex.dispose(), [labelTex]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime + spec.index * 1.7;
    const pulseSpeed = spec.safe && safeExit ? 2.5 * safeExit.pulseScale : 2.5 + pressure.lightInstability * 3;
    const pulse = 0.3 * Math.sin(time * pulseSpeed) + 1;
    const stability = spec.safe && safeExit ? safeExit.portalStability : pressure.portalGlow;
    if (frameRef.current) frameRef.current.emissiveIntensity = (active ? 2.6 : 1.1) * pulse * stability;
    if (glowRef.current) glowRef.current.opacity = (active ? 0.5 : 0.22) * pulse * stability;
    if (spiritRef.current) {
      spiritRef.current.position.y = Math.sin(time * 1.3) * 0.06;
      const s = 1 + Math.sin(time * 1.9) * 0.03;
      spiritRef.current.scale.set(s, s, 1);
    }
  });

  const take = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    crossDoor(spec.index);
  };

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]} onClick={take}>
      <pointLight position={[0, 0, 0.4]} intensity={active ? 2.2 : 1} distance={4} decay={2} color={color} />
      <mesh>
        <boxGeometry args={[DOOR_W + 0.3, DOOR_H + 0.3, 0.18]} />
        <meshStandardMaterial
          ref={frameRef}
          color="#03080a"
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color="#01030a" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={spiritRef}>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[DOOR_W, DOOR_H]} />
          <meshBasicMaterial ref={glowRef} color={color} transparent opacity={0.22} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position={[0, DOOR_H / 2 + 0.5, 0.14]}>
          <planeGeometry args={[0.7, 0.7]} />
          <meshBasicMaterial map={labelTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
