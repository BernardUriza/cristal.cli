import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "./store";
import { useKeyboard } from "./input/useKeyboard";
import type { RoomShape } from "./types";
import type { Room } from "./roomApi";

const EYE_HEIGHT = 1.6;
const MOVE_SPEED = 4;
const PLAYER_RADIUS = 0.5;
const DOOR_RANGE = 2.4;
const DOOR_W = 1.4;
const DOOR_H = 2.4;

interface Dims {
  w: number;
  d: number;
  h: number;
}

// Procedural proportions per shape — the LLM's chosen form becomes real space.
function dimsForShape(shape: RoomShape): Dims {
  switch (shape) {
    case "corridor":
      return { w: 6, d: 20, h: 4 };
    case "shaft":
      return { w: 8, d: 8, h: 13 };
    case "void":
      return { w: 24, d: 24, h: 9 };
    case "chamber":
    default:
      return { w: 12, d: 12, h: 5 };
  }
}

// Dread tints the room from cold green (calm) toward dim blood-red (terror) and
// pulls the fog in close, so a high-dread room feels claustrophobic and hostile.
function atmosphere(dread: number) {
  const t = Math.max(0, Math.min(100, dread)) / 100;
  const base = new THREE.Color("#06140d");
  const terror = new THREE.Color("#1a0604");
  const fogColor = base.clone().lerp(terror, t);
  const wallColor = new THREE.Color("#16271d").lerp(new THREE.Color("#2a1310"), t);
  const fogNear = 4 + (1 - t) * 6;
  const fogFar = 20 + (1 - t) * 30;
  // backrooms fluorescence: the room stays evenly lit and visible; dread only
  // dims and reddens it, never plunges it to a black void.
  const ambient = 1.0 - t * 0.35;
  return { fogColor, wallColor, fogNear, fogFar, ambient };
}

interface DoorSpec {
  index: number;
  position: [number, number, number];
  rotationY: number;
}

// Distribute exits across the four walls (front/back/left/right), each door set
// into its wall and facing inward.
function buildDoors(room: Room, dims: Dims): DoorSpec[] {
  const hw = dims.w / 2;
  const hd = dims.d / 2;
  const y = DOOR_H / 2;
  const slots: Omit<DoorSpec, "index">[] = [
    { position: [0, y, -hd + 0.05], rotationY: 0 },
    { position: [0, y, hd - 0.05], rotationY: Math.PI },
    { position: [-hw + 0.05, y, 0], rotationY: Math.PI / 2 },
    { position: [hw - 0.05, y, 0], rotationY: -Math.PI / 2 },
  ];
  return room.exits
    .slice(0, slots.length)
    .map((_, i) => ({ index: i, ...slots[i] }));
}

function Door({
  spec,
  color,
  active,
}: {
  spec: DoorSpec;
  color: THREE.Color;
  active: boolean;
}) {
  const frameRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const pulse = 0.3 * Math.sin(clock.elapsedTime * 2.5) + 1;
    if (frameRef.current) frameRef.current.emissiveIntensity = (active ? 2.6 : 1.1) * pulse;
    if (glowRef.current) glowRef.current.opacity = (active ? 0.5 : 0.22) * pulse;
  });

  const take = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useGame.getState().takeExit(spec.index);
  };

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]} onClick={take}>
      <pointLight position={[0, 0, 0.4]} intensity={active ? 2.2 : 1} distance={4} decay={2} color={color} />
      {/* portal glow */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial ref={glowRef} color={color} transparent opacity={0.22} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* frame */}
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
      {/* dark doorway cut */}
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color="#01030a" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FirstPersonController({ dims }: { dims: Dims }) {
  const { camera, gl } = useThree();
  const torch = useRef<THREE.PointLight>(null);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const pos = useRef(new THREE.Vector3(0, EYE_HEIGHT, dims.d / 2 - 1.5));
  const input = useKeyboard(true);
  const room = useGame((s) => s.room);
  const setNearbyExit = useGame((s) => s.setNearbyExit);
  const doors = useMemo(() => (room ? buildDoors(room, dims) : []), [room, dims]);
  const seed = room?.seed;

  // Respawn at the entrance whenever the room itself changes.
  useEffect(() => {
    pos.current.set(0, EYE_HEIGHT, dims.d / 2 - 1.5);
    yaw.current = Math.PI; // look into the room
    pitch.current = 0;
  }, [seed, dims.d]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = () => canvas.requestPointerLock();
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.0025;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0025, -1.2, 1.2);
    };
    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
    };
  }, [gl]);

  // E crosses the nearest door in range.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const idx = useGame.getState().nearbyExit;
      if (idx !== null) useGame.getState().takeExit(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const i = input.current;
    fwd.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
    right.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current)).normalize();
    const iz = (i.forward ? 1 : 0) - (i.back ? 1 : 0);
    const ix = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    move.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(right, ix);
    if (move.lengthSq() > 0.0001) {
      move.normalize();
      pos.current.x += move.x * MOVE_SPEED * dt;
      pos.current.z += move.z * MOVE_SPEED * dt;
    }
    // clamp inside the box walls
    const hw = dims.w / 2 - PLAYER_RADIUS;
    const hd = dims.d / 2 - PLAYER_RADIUS;
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -hw, hw);
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -hd, hd);

    camera.position.copy(pos.current);
    camera.lookAt(
      pos.current.x + Math.sin(yaw.current) * Math.cos(pitch.current),
      pos.current.y + Math.sin(pitch.current),
      pos.current.z + Math.cos(yaw.current) * Math.cos(pitch.current)
    );

    // nearest door in range -> drives the E prompt
    let near: number | null = null;
    let best = DOOR_RANGE;
    for (const d of doors) {
      const dx = d.position[0] - pos.current.x;
      const dz = d.position[2] - pos.current.z;
      const dist = Math.hypot(dx, dz);
      if (dist < best) {
        best = dist;
        near = d.index;
      }
    }
    if (near !== useGame.getState().nearbyExit) setNearbyExit(near);

    // the player carries light, same as the maze torch
    if (torch.current) torch.current.position.copy(pos.current);
  });

  return <pointLight ref={torch} intensity={5} distance={Math.max(dims.w, dims.d) * 0.9} decay={2} color="#9ff5cf" />;
}

export function RoomScene() {
  const room = useGame((s) => s.room);
  const nearbyExit = useGame((s) => s.nearbyExit);

  const dims = useMemo(() => (room ? dimsForShape(room.shape) : dimsForShape("chamber")), [room]);
  const atmo = useMemo(() => atmosphere(room?.dread ?? 0), [room]);
  const doors = useMemo(() => (room ? buildDoors(room, dims) : []), [room, dims]);

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: atmo.wallColor,
        emissive: atmo.wallColor.clone().multiplyScalar(0.6),
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.BackSide,
      }),
    [atmo.wallColor]
  );

  if (!room) return null;

  const doorColor = new THREE.Color("#7dffd0");

  return (
    <>
      <color attach="background" args={[atmo.fogColor]} />
      <fog attach="fog" args={[atmo.fogColor, atmo.fogNear, atmo.fogFar]} />

      <ambientLight intensity={atmo.ambient} color={atmo.fogColor.clone().offsetHSL(0, 0, 0.3)} />
      <pointLight position={[0, dims.h - 0.6, 0]} intensity={2.2} distance={dims.w + dims.d} decay={2} color="#aef5d0" castShadow />

      {/* shell: floor, ceiling, four walls as one inside-out box */}
      <mesh position={[0, dims.h / 2, 0]} material={wallMat}>
        <boxGeometry args={[dims.w, dims.h, dims.d]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[dims.w, dims.d]} />
        <meshStandardMaterial color={atmo.wallColor.clone().multiplyScalar(0.7)} roughness={0.95} />
      </mesh>

      {doors.map((d) => (
        <Door key={d.index} spec={d} color={doorColor} active={nearbyExit === d.index} />
      ))}

      <FirstPersonController dims={dims} />
    </>
  );
}
