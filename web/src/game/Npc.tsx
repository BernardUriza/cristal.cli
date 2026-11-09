import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CapsuleAvatar, MixamoCharacter } from "./Character";
import { ErrorBoundary } from "./ErrorBoundary";
import { useGame } from "./store";
import { GameMode, type Locomotion } from "./types";
import { getPlayerPose } from "./playerPositionBus";
import { makeConsoleLabelTexture } from "./textTexture";

interface NpcProps {
  id: string;
  label: string;
  accent: string;
  position: [number, number, number];
}

const TURN_SPEED = 2.5;

/**
 * An inhabitant of the labyrinth: the same Mixamo body as the player, standing
 * idle in a cell, turning to face whoever approaches. Interaction (E, camera,
 * overlay) rides the console pipeline, so this component only has to be a body.
 */
export function Npc({ id, label, accent, position }: NpcProps) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const loco = useRef<Locomotion>("idle");
  const labelTex = useMemo(() => makeConsoleLabelTexture(label, accent), [label, accent]);
  const target = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useEffect(() => () => labelTex.dispose(), [labelTex]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const pose = getPlayerPose();
    const dx = pose.x - position[0];
    const dz = pose.z - position[2];
    if (dx * dx + dz * dz < 64) {
      target.setFromAxisAngle(up, Math.atan2(dx, dz));
      g.quaternion.slerp(target, Math.min(1, dt * TURN_SPEED));
    }
    if (light.current) {
      const { nearbyConsoleId, activeConsoleId, mode } = useGame.getState();
      const talking = activeConsoleId === id && mode !== GameMode.Exploration;
      const near = nearbyConsoleId === id;
      const base = talking ? 3.2 : near ? 2.2 : 1.2;
      light.current.intensity = base * (1 + 0.15 * Math.sin(clock.elapsedTime * 2));
    }
  });

  return (
    <group position={position}>
      <pointLight ref={light} position={[0, 2.0, 0]} intensity={1.2} distance={5} decay={2} color={accent} />
      <group ref={group}>
        <Suspense fallback={<CapsuleAvatar moving={false} />}>
          <ErrorBoundary fallback={<CapsuleAvatar moving={false} />}>
            <MixamoCharacter loco={loco} />
          </ErrorBoundary>
        </Suspense>
        {/* the name turns with the body, so whoever he faces reads it, never its mirror */}
        <mesh position={[0, 2.25, 0]}>
          <planeGeometry args={[1.6, 0.5]} />
          <meshBasicMaterial map={labelTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
