import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CapsuleAvatar, MixamoCharacter } from "./Character";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { GameMode, type Locomotion } from "./types";
import { useGame } from "./store";
import type { Maze } from "./maze";
import { publishPlayerPose } from "./playerPositionBus";
import { useKeyboard } from "./input/useKeyboard";
import type { GlyphRef } from "./RitualGlyph";
import { ROTATION_SPEED, stepGravity, stepMovement } from "./player/movement";
import { findNearestId } from "./player/proximity";
import {
  computeConsoleCamera,
  computeExplorationCamera,
  CONSOLE_LERP,
  EXPLORE_LERP,
} from "./player/cameraRig";
import { usePointerLook } from "./player/usePointerLook";
import { useInteractKey } from "./player/useInteractKey";

export interface ConsoleRef {
  id: string;
  label: string;
  position: THREE.Vector3;
}

interface PlayerProps {
  maze: Maze;
  spawn: [number, number, number];
  consoles: ConsoleRef[];
  glyphs: GlyphRef[];
}

export function Player({ maze, spawn, consoles, glyphs }: PlayerProps) {
  const { camera, gl, scene } = useThree();
  const mode = useGame((s) => s.mode);
  const setNearbyConsole = useGame((s) => s.setNearbyConsole);
  const setNearbyGlyph = useGame((s) => s.setNearbyGlyph);
  const setLocomotion = useGame((s) => s.setLocomotion);

  const group = useRef<THREE.Group>(null);
  const savedPose = useGame.getState().mazePose;
  const pos = useRef(new THREE.Vector3(...(savedPose?.pos ?? spawn)));
  const posPubAccum = useRef(0);
  const vertical = useRef({ velY: 0, grounded: true });
  const loco = useRef<Locomotion>("idle");
  const lastLoco = useRef<Locomotion>("idle");

  // Remember where we stood so leaving a room returns us here, not the centre.
  useEffect(() => {
    return () => {
      useGame.getState().setMazePose({
        pos: [pos.current.x, pos.current.y, pos.current.z],
        yaw: yaw.current,
      });
    };
  }, []);

  const exploring = mode === GameMode.Exploration;
  const input = useKeyboard(exploring);
  const { yaw, pitch } = usePointerLook(gl.domElement, exploring, {
    initialYaw: savedPose?.yaw ?? 0,
  });
  useInteractKey(glyphs);

  const desiredCam = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  if (import.meta.env.DEV) {
    const devWindow = window as unknown as {
      __player: typeof pos;
      __glyphs: GlyphRef[];
      __scene: THREE.Scene;
    };
    devWindow.__player = pos;
    devWindow.__glyphs = glyphs;
    devWindow.__scene = scene;
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // clamp big frame gaps

    if (exploring) {
      const i = input.current;
      const move = stepMovement(maze, pos.current, yaw.current, i, dt);
      loco.current = move.locomotion;

      if (move.targetYaw !== null && group.current) {
        const q = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          move.targetYaw
        );
        group.current.quaternion.slerp(q, ROTATION_SPEED * dt);
      }

      if (stepGravity(pos.current, vertical.current, i.jump, dt)) {
        input.current.jump = false;
      }

      const nearest = findNearestId(consoles, pos.current);
      if (nearest !== useGame.getState().nearbyConsoleId) setNearbyConsole(nearest);
      const nearestGlyph = findNearestId(glyphs, pos.current);
      if (nearestGlyph !== useGame.getState().nearbyGlyphId) setNearbyGlyph(nearestGlyph);
    } else {
      loco.current = "idle";
    }

    if (loco.current !== lastLoco.current) {
      lastLoco.current = loco.current;
      setLocomotion(loco.current);
    }

    if (group.current) group.current.position.copy(pos.current);

    // Publish the live pose for the 2D minimap at ~12Hz (never via the store).
    posPubAccum.current += dt;
    if (posPubAccum.current >= 1 / 12) {
      posPubAccum.current = 0;
      publishPlayerPose({ x: pos.current.x, z: pos.current.z, heading: yaw.current });
    }

    if (exploring) {
      computeExplorationCamera(maze, pos.current, yaw.current, pitch.current, desiredCam, lookTarget);
    } else {
      const active = consoles.find((c) => c.id === useGame.getState().activeConsoleId);
      computeConsoleCamera(pos.current, active ? active.position : pos.current, desiredCam, lookTarget);
    }
    camera.position.lerp(desiredCam, exploring ? EXPLORE_LERP : CONSOLE_LERP);
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={group} position={spawn}>
      {/* torch so the player is always lit, even in dark corridors */}
      <pointLight position={[0, 2.2, 0]} intensity={6} distance={12} decay={2} color="#7dffc4" />
      <Suspense fallback={<CapsuleAvatar moving={false} />}>
        <ErrorBoundary fallback={<CapsuleAvatar moving={false} />}>
          <MixamoCharacter loco={loco} />
        </ErrorBoundary>
      </Suspense>
    </group>
  );
}
