import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, fakeExitForRoom } from "./store";
import { useKeyboard } from "./input/useKeyboard";
import { playEnterDrone, playCross, playAlarm } from "./audio";
import { resolveRoomPressureAtmosphere, type RoomPressureAtmosphere } from "./RoomPressureController";
import { resolveSafeExit, type SafeExit } from "./SafeExitResolver";
import { generateMicroMirrors, type MicroMirrors } from "./MicroMirrorGenerator";
import type { RoomShape } from "./types";
import type { Room } from "./roomApi";

const STABILITY_TICK = 0.25; // seconds between stability writes

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
  const wallColor = new THREE.Color("#1c3024").lerp(new THREE.Color("#42241d"), t);
  const fogNear = 5 + (1 - t) * 6;
  const fogFar = 22 + (1 - t) * 30;
  // backrooms fluorescence: the room stays evenly lit and legible at any dread —
  // dread only dims and reddens it, never plunges it to a black void. The floor
  // keeps a hard minimum so a high-dread room is oppressive, not unreadable.
  const ambient = Math.max(0.72, 1.1 - t * 0.3);
  return { fogColor, wallColor, fogNear, fogFar, ambient };
}

// Each shape wears a different surface so the form reads by material, not just
// proportion: chamber concrete, corridor brushed metal, shaft wet stone, void
// matte nothing.
function surfaceForShape(shape: RoomShape): { roughness: number; metalness: number } {
  switch (shape) {
    case "corridor":
      return { roughness: 0.42, metalness: 0.6 };
    case "shaft":
      return { roughness: 0.55, metalness: 0.25 };
    case "void":
      return { roughness: 0.98, metalness: 0.0 };
    case "chamber":
    default:
      return { roughness: 0.9, metalness: 0.06 };
  }
}

// Inscription rendered onto a canvas texture, wrapped to fit the wall — the
// prophet's line, carved where the player faces on entering.
function makeInscriptionTexture(text: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#8af5cf";
  ctx.font = "italic 46px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#33ffcc";
  ctx.shadowBlur = 16;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 80 && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const lh = 56;
  const startY = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, startY + i * lh));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface DoorSpec {
  index: number;
  position: [number, number, number];
  rotationY: number;
  safe: boolean;
  label: string;
}

// In-world door label as a canvas texture — no external font fetch, works
// offline. The door's full sinister phrase stays in the HUD; the world shows
// the crossing key.
function makeLabelTexture(label: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#7dffd0";
  ctx.font = "bold 88px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#33ffcc";
  ctx.shadowBlur = 18;
  ctx.fillText(label, size / 2, size / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function doorSlots(dims: Dims): Omit<DoorSpec, "index" | "safe" | "label">[] {
  const hw = dims.w / 2;
  const hd = dims.d / 2;
  const y = DOOR_H / 2;
  return [
    { position: [0, y, -hd + 0.05], rotationY: 0 },
    { position: [0, y, hd - 0.05], rotationY: Math.PI },
    { position: [-hw + 0.05, y, 0], rotationY: Math.PI / 2 },
    { position: [hw - 0.05, y, 0], rotationY: -Math.PI / 2 },
  ];
}

// Distribute exits across the four walls (front/back/left/right), each door set
// into its wall and facing inward.
function buildDoors(
  room: Room,
  dims: Dims,
  safeExit: SafeExit | null = null,
  mirrors: MicroMirrors | null = null
): DoorSpec[] {
  const slots = doorSlots(dims);
  const count = Math.min(slots.length, room.exits.length + (safeExit ? 1 : 0));
  return Array.from({ length: count }, (_, i) => ({
    ...slots[i],
    index: i,
    safe: safeExit?.index === i,
    label: mirrors?.doorLabelMode === "clinical" ? `D-${String(i + 1).padStart(2, "0")}` : String(i + 1),
  }));
}

function Door({
  spec,
  color,
  active,
  pressure,
  safeExit,
}: {
  spec: DoorSpec;
  color: THREE.Color;
  active: boolean;
  pressure: RoomPressureAtmosphere;
  safeExit: SafeExit | null;
}) {
  const frameRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const spiritRef = useRef<THREE.Group>(null);
  const labelTex = useMemo(() => makeLabelTexture(spec.label), [spec.label]);
  // free the GPU texture when the door changes or unmounts — r3f never disposes
  // a material's map, so without this every room crossing leaks textures.
  useEffect(() => () => labelTex.dispose(), [labelTex]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime + spec.index * 1.7; // phase-offset per door
    const pulseSpeed = spec.safe && safeExit ? 2.5 * safeExit.pulseScale : 2.5 + pressure.lightInstability * 3;
    const pulse = 0.3 * Math.sin(time * pulseSpeed) + 1;
    const stability = spec.safe && safeExit ? safeExit.portalStability : pressure.portalGlow;
    if (frameRef.current) {
      frameRef.current.emissiveIntensity = (active ? 2.6 : 1.1) * pulse * stability;
    }
    if (glowRef.current) {
      glowRef.current.opacity = (active ? 0.5 : 0.22) * pulse * stability;
    }
    // idle breathing: the portal's glow + label drift and swell
    if (spiritRef.current) {
      spiritRef.current.position.y = Math.sin(time * 1.3) * 0.06;
      const s = 1 + Math.sin(time * 1.9) * 0.03;
      spiritRef.current.scale.set(s, s, 1);
    }
  });

  const take = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    // doors require real proximity — a click from across the room does nothing
    const { nearbyExit, room } = useGame.getState();
    if (nearbyExit !== spec.index) return;
    if (room && spec.index === fakeExitForRoom(room)) playAlarm();
    else playCross();
    useGame.getState().takeExit(spec.index);
  };

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]} onClick={take}>
      <pointLight position={[0, 0, 0.4]} intensity={active ? 2.2 : 1} distance={4} decay={2} color={color} />
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
      {/* breathing portal spirit: glow + crossing-key label */}
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

function FirstPersonController({ dims }: { dims: Dims }) {
  const { camera, gl } = useThree();
  const torch = useRef<THREE.PointLight>(null);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const pos = useRef(new THREE.Vector3(0, EYE_HEIGHT, dims.d / 2 - 1.5));
  const input = useKeyboard(true);
  const room = useGame((s) => s.room);
  const setNearbyExit = useGame((s) => s.setNearbyExit);
  const psychologicalPressure = useGame((s) => s.psychologicalPressure);
  const psychologicalStance = useGame((s) => s.psychologicalStance);
  const emotionalHistory = useGame((s) => s.emotionalHistory);
  const falseDoorCount = useGame((s) => s.falseDoorAnnotations.length);
  const safeExit = useMemo(
    () =>
      room
        ? resolveSafeExit({
            stance: psychologicalStance,
            pressure: psychologicalPressure,
            room,
          })
        : null,
    [room, psychologicalPressure, psychologicalStance]
  );
  const mirrors = useMemo(
    () =>
      room
        ? generateMicroMirrors({
            room,
            emotionalHistory,
            falseDoorCount,
          })
        : null,
    [room, emotionalHistory, falseDoorCount]
  );
  const doors = useMemo(() => (room ? buildDoors(room, dims, safeExit, mirrors) : []), [room, dims, safeExit, mirrors]);
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
      const { nearbyExit: idx, room } = useGame.getState();
      if (idx !== null) {
        if (room && idx === fakeExitForRoom(room)) playAlarm();
        else playCross();
        useGame.getState().takeExit(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Room integrity decays with time, faster the higher the dread. At zero the
  // room collapses and the player is thrown back to the maze.
  const tickAcc = useRef(0);
  useEffect(() => {
    tickAcc.current = 0;
  }, [seed]);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const i = input.current;
    fwd.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
    // screen-right = cross(forward, up); the negative form inverted A/D strafe.
    right.set(-Math.cos(yaw.current), 0, Math.sin(yaw.current)).normalize();
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

    // room integrity decay — batched a few times a second through the engine
    tickAcc.current += dt;
    if (tickAcc.current >= STABILITY_TICK) {
      const beforeRoom = useGame.getState().room;
      useGame.getState().tickStability(tickAcc.current);
      tickAcc.current = 0;
      if (beforeRoom && !useGame.getState().room) playAlarm(); // collapsed
    }
  });

  return <pointLight ref={torch} intensity={5} distance={Math.max(dims.w, dims.d) * 0.9} decay={2} color="#9ff5cf" />;
}

// Ceiling fluorescence that pulses; high dread makes it flicker faster and more
// erratically, like a failing tube.
function CeilingLight({
  dims,
  dread,
  color,
  pressure,
}: {
  dims: Dims;
  dread: number;
  color: THREE.Color;
  pressure: RoomPressureAtmosphere;
}) {
  const ref = useRef<THREE.PointLight>(null);
  const t = Math.max(0, Math.min(100, dread)) / 100;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = clock.elapsedTime;
    const slow = Math.sin(time * (1 + t * 3));
    const flicker = t > 0.5 ? Math.sin(time * 37) * (t - 0.5) * 0.5 : 0;
    const pressureFlicker = Math.sin(time * 29) * pressure.lightInstability * 0.45;
    ref.current.intensity =
      2.0 + slow * (0.3 + t * 0.6 + pressure.wallPulse * 0.35) + flicker + pressureFlicker;
  });
  return (
    <pointLight
      ref={ref}
      position={[0, dims.h - 0.6, 0]}
      intensity={2.2}
      distance={dims.w + dims.d}
      decay={2}
      color={color}
      castShadow
    />
  );
}

function RoomShell({
  dims,
  material,
  pressure,
}: {
  dims: Dims;
  material: THREE.MeshStandardMaterial;
  pressure: RoomPressureAtmosphere;
}) {
  useFrame(({ clock }) => {
    const breath = (Math.sin(clock.elapsedTime * (1.1 + pressure.wallPulse * 2.4)) + 1) / 2;
    material.emissiveIntensity = 0.45 + breath * pressure.wallPulse;
  });

  return (
    <mesh position={[0, dims.h / 2, 0]} material={material}>
      <boxGeometry args={[dims.w, dims.h, dims.d]} />
    </mesh>
  );
}

function DeadCorridors({
  dims,
  usedDoors,
  count,
  color,
}: {
  dims: Dims;
  usedDoors: number;
  count: number;
  color: THREE.Color;
}) {
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

export function RoomScene() {
  const room = useGame((s) => s.room);
  const nearbyExit = useGame((s) => s.nearbyExit);
  const psychologicalPressure = useGame((s) => s.psychologicalPressure);
  const psychologicalStance = useGame((s) => s.psychologicalStance);
  const roomPressureSpike = useGame((s) => s.roomPressureSpike);
  const pressureEnding = useGame((s) => s.pressureEnding);
  const emotionalHistory = useGame((s) => s.emotionalHistory);
  const falseDoorCount = useGame((s) => s.falseDoorAnnotations.length);

  const dims = useMemo(() => (room ? dimsForShape(room.shape) : dimsForShape("chamber")), [room]);
  const atmo = useMemo(() => atmosphere(room?.dread ?? 0), [room]);
  const pressure = useMemo(
    () =>
      resolveRoomPressureAtmosphere({
        pressure: pressureEnding?.active
          ? pressureEnding.atmospherePressure
          : psychologicalPressure + roomPressureSpike,
      }),
    [psychologicalPressure, pressureEnding, roomPressureSpike]
  );
  const safeExit = useMemo(
    () =>
      room
        ? resolveSafeExit({
            stance: psychologicalStance,
            pressure: psychologicalPressure,
            room,
          })
        : null,
    [room, psychologicalPressure, psychologicalStance]
  );
  const mirrors = useMemo(
    () =>
      room
        ? generateMicroMirrors({
            room,
            emotionalHistory,
            falseDoorCount,
          })
        : null,
    [room, emotionalHistory, falseDoorCount]
  );
  const doors = useMemo(() => (room ? buildDoors(room, dims, safeExit, mirrors) : []), [room, dims, safeExit, mirrors]);
  const surface = useMemo(() => surfaceForShape(room?.shape ?? "chamber"), [room]);
  const inscriptionTex = useMemo(
    () => (room ? makeInscriptionTexture(room.inscription) : null),
    [room]
  );

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: atmo.wallColor,
        emissive: atmo.wallColor.clone().multiplyScalar(0.6),
        roughness: surface.roughness,
        metalness: surface.metalness,
        side: THREE.BackSide,
      }),
    [atmo.wallColor, surface.roughness, surface.metalness]
  );

  // Free GPU resources when the room changes / RoomScene unmounts; r3f does not
  // dispose imperatively-created textures or materials.
  useEffect(() => () => inscriptionTex?.dispose(), [inscriptionTex]);
  useEffect(() => () => wallMat.dispose(), [wallMat]);

  // Drone on entering a room (and whenever the room is rewritten).
  const seed = room?.seed;
  const dread = room?.dread ?? 0;
  useEffect(() => {
    if (seed !== undefined) playEnterDrone(dread);
  }, [seed, dread]);

  if (!room) return null;

  const pressureColor = new THREE.Color(pressure.ambientColor);
  const doorColor = new THREE.Color("#7dffd0").lerp(new THREE.Color("#ffd1a6"), pressure.pressure * 0.35);
  const safeDoorColor = new THREE.Color("#ffd1a6").lerp(new THREE.Color("#fff1cc"), safeExit?.warmth ?? 0);
  const ceilingColor = atmo.fogColor.clone().lerp(pressureColor, pressure.pressure).offsetHSL(0, 0, 0.4);
  const fogColor = atmo.fogColor.clone().lerp(pressureColor, pressure.pressure * 0.7);
  const fogNear = Math.max(1.5, atmo.fogNear - pressure.fogDensity * 4);
  const fogFar = Math.max(fogNear + 5, atmo.fogFar - pressure.fogDensity * 16);

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <ambientLight
        intensity={Math.max(0.52, atmo.ambient - pressure.fogDensity * 0.2)}
        color={pressureColor.clone().lerp(atmo.fogColor, 0.35).offsetHSL(0, 0, 0.22)}
      />
      <CeilingLight dims={dims} dread={room.dread} color={ceilingColor} pressure={pressure} />

      {/* shell: floor, ceiling, four walls as one inside-out box */}
      <RoomShell dims={dims} material={wallMat} pressure={pressure} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[dims.w, dims.d]} />
        <meshStandardMaterial color={atmo.wallColor.clone().multiplyScalar(0.7)} roughness={0.95} />
      </mesh>

      {/* inscription carved on the front wall, above the player's entry gaze */}
      {inscriptionTex && (
        <mesh position={[0, dims.h * 0.66, -dims.d / 2 + 0.08]}>
          <planeGeometry args={[Math.min(dims.w * 0.8, 7), Math.min(dims.w * 0.8, 7) / 4]} />
          <meshBasicMaterial map={inscriptionTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {doors.map((d) => (
        <Door
          key={d.index}
          spec={d}
          color={d.safe ? safeDoorColor : doorColor}
          active={nearbyExit === d.index}
          pressure={pressure}
          safeExit={safeExit}
        />
      ))}
      {mirrors && mirrors.deadCorridors > 0 && (
        <DeadCorridors
          dims={dims}
          usedDoors={doors.length}
          count={mirrors.deadCorridors}
          color={doorColor}
        />
      )}

      <FirstPersonController dims={dims} />
    </>
  );
}
