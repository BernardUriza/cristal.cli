import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CapsuleAvatar, MixamoCharacter } from "./Character";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { GameMode, type Locomotion } from "./types";
import { useGame } from "./store";
import { isWalkable, type Maze } from "./maze";
import { useKeyboard } from "./input/useKeyboard";
import { symbolicBus } from "./symbolicBus";
import type { GlyphRef } from "./RitualGlyph";

const WALK_SPEED = 4;
const SPRINT_SPEED = 7;
const CROUCH_SPEED = 2;
const GRAVITY = -15;
const JUMP_HEIGHT = 1.2;
const ROTATION_SPEED = 10;
const PLAYER_RADIUS = 0.6;
const CAM_DISTANCE = 6;
const CAM_HEIGHT = 1.6;
const INTERACT_RANGE = 2.6;

export interface ConsoleRef {
  id: string;
  position: THREE.Vector3;
}

interface PlayerProps {
  maze: Maze;
  spawn: [number, number, number];
  consoles: ConsoleRef[];
  glyphs: GlyphRef[];
}

export function Player({ maze, spawn, consoles, glyphs }: PlayerProps) {
  const { camera, gl } = useThree();
  const mode = useGame((s) => s.mode);
  const setNearbyConsole = useGame((s) => s.setNearbyConsole);
  const setNearbyGlyph = useGame((s) => s.setNearbyGlyph);
  const enterConsoleMode = useGame((s) => s.enterConsoleMode);

  const group = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(...spawn));
  const velY = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0.25);
  const grounded = useRef(true);
  const moving = useRef(false);
  const loco = useRef<Locomotion>("idle");
  const lastLoco = useRef<Locomotion>("idle");
  const setLocomotion = useGame((s) => s.setLocomotion);

  const input = useKeyboard(mode === GameMode.Exploration);

  // Pointer-lock mouse look (exploration only).
  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = () => {
      if (mode === GameMode.Exploration) canvas.requestPointerLock();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.0025;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - e.movementY * 0.0025,
        -0.4,
        0.9
      );
    };
    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
    };
  }, [gl, mode]);

  // E invokes a nearby ritual glyph, else enters a nearby console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const { mode: m, nearbyConsoleId, nearbyGlyphId } = useGame.getState();
      if (m !== GameMode.Exploration) return;
      if (nearbyGlyphId) {
        const glyph = glyphs.find((g) => g.id === nearbyGlyphId);
        if (glyph) {
          symbolicBus.emit({ signal: "invoked", archetype: glyph.archetype, intensity: 60 });
          useGame.getState().invokeGlyph(glyph.archetype, glyph.id);
        }
      } else if (nearbyConsoleId) {
        enterConsoleMode(nearbyConsoleId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enterConsoleMode, glyphs]);

  const tmpForward = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const tmpMove = useMemo(() => new THREE.Vector3(), []);
  const desiredCam = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  const { scene } = useThree();
  if (import.meta.env.DEV) {
    (window as unknown as { __player: typeof pos; __glyphs: GlyphRef[]; __scene: THREE.Scene }).__player = pos;
    (window as unknown as { __player: typeof pos; __glyphs: GlyphRef[]; __scene: THREE.Scene }).__glyphs = glyphs;
    (window as unknown as { __player: typeof pos; __glyphs: GlyphRef[]; __scene: THREE.Scene }).__scene = scene;
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // clamp big frame gaps
    const exploring = mode === GameMode.Exploration;

    if (exploring) {
      const i = input.current;
      tmpForward.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
      tmpRight.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current)).normalize();

      const ix = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      const iz = (i.forward ? 1 : 0) - (i.back ? 1 : 0);
      tmpMove.set(0, 0, 0).addScaledVector(tmpForward, iz).addScaledVector(tmpRight, ix);
      moving.current = tmpMove.lengthSq() > 0.001;

      if (moving.current) {
        tmpMove.normalize();
        let speed = WALK_SPEED;
        const sprinting = i.sprint && !i.crouch;
        if (sprinting) speed = SPRINT_SPEED;
        else if (i.crouch) speed = CROUCH_SPEED;
        loco.current = sprinting ? "run" : "walk";

        // Resolve axes independently so we slide along walls.
        const nextX = pos.current.x + tmpMove.x * speed * dt;
        if (isWalkable(maze, nextX, pos.current.z, PLAYER_RADIUS)) pos.current.x = nextX;
        const nextZ = pos.current.z + tmpMove.z * speed * dt;
        if (isWalkable(maze, pos.current.x, nextZ, PLAYER_RADIUS)) pos.current.z = nextZ;

        // Rotate model toward movement direction.
        if (group.current) {
          const targetYaw = Math.atan2(tmpMove.x, tmpMove.z);
          const q = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            targetYaw
          );
          group.current.quaternion.slerp(q, ROTATION_SPEED * dt);
        }
      }

      // Gravity + jump.
      if (grounded.current && velY.current < 0) velY.current = -2;
      if (i.jump && grounded.current) {
        velY.current = Math.sqrt(JUMP_HEIGHT * -2 * GRAVITY);
        grounded.current = false;
        input.current.jump = false;
      }
      velY.current += GRAVITY * dt;
      pos.current.y += velY.current * dt;
      if (pos.current.y <= 0) {
        pos.current.y = 0;
        velY.current = 0;
        grounded.current = true;
      }

      // Nearby console detection.
      let nearest: string | null = null;
      let nearestDist = INTERACT_RANGE;
      for (const c of consoles) {
        const d = c.position.distanceTo(pos.current);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = c.id;
        }
      }
      if (nearest !== useGame.getState().nearbyConsoleId) setNearbyConsole(nearest);

      let nearestGlyph: string | null = null;
      let nearestGlyphDist = INTERACT_RANGE;
      for (const g of glyphs) {
        const d = g.position.distanceTo(pos.current);
        if (d < nearestGlyphDist) {
          nearestGlyphDist = d;
          nearestGlyph = g.id;
        }
      }
      if (nearestGlyph !== useGame.getState().nearbyGlyphId) setNearbyGlyph(nearestGlyph);

      if (!moving.current) loco.current = "idle";
    } else {
      moving.current = false;
      loco.current = "idle";
    }

    if (loco.current !== lastLoco.current) {
      lastLoco.current = loco.current;
      setLocomotion(loco.current);
    }

    // Apply transform to the visual group.
    if (group.current) group.current.position.copy(pos.current);

    // Camera: follow in exploration, focus on console otherwise.
    if (exploring) {
      const horiz = CAM_DISTANCE * Math.cos(pitch.current);
      desiredCam.set(
        pos.current.x - Math.sin(yaw.current) * horiz,
        pos.current.y + CAM_HEIGHT + CAM_DISTANCE * Math.sin(pitch.current),
        pos.current.z - Math.cos(yaw.current) * horiz
      );
      lookTarget.set(pos.current.x, pos.current.y + 1.2, pos.current.z);

      // Camera-wall collision: pull in if the desired spot would clip a wall.
      const dir = desiredCam.clone().sub(lookTarget);
      const dist = dir.length();
      dir.normalize();
      let safe = dist;
      for (let d = 0.6; d <= dist; d += 0.4) {
        if (!isWalkable(maze, lookTarget.x + dir.x * d, lookTarget.z + dir.z * d, 0.35)) {
          safe = Math.max(0.9, d - 0.4);
          break;
        }
      }
      desiredCam.copy(lookTarget).addScaledVector(dir, safe);
    } else {
      const active = consoles.find((c) => c.id === useGame.getState().activeConsoleId);
      const focus = active ? active.position : pos.current;
      const dir = tmpMove.copy(pos.current).sub(focus).setY(0).normalize();
      desiredCam.set(
        focus.x + dir.x * 2.4,
        focus.y + 1.4,
        focus.z + dir.z * 2.4
      );
      lookTarget.copy(focus).setY(focus.y + 1.0);
    }

    camera.position.lerp(desiredCam, exploring ? 0.18 : 0.08);
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
