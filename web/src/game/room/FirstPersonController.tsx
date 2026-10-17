import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../store";
import { useKeyboard } from "../input/useKeyboard";
import { computeMoveDirection } from "../player/movement";
import { usePointerLook } from "../player/usePointerLook";
import { playAlarm } from "../audio";
import { crossDoor } from "./Door";
import { nearestDoorIndex, type Dims, type DoorSpec } from "./geometry";
import { DOOR_RANGE, EYE_HEIGHT, MOVE_SPEED, PLAYER_RADIUS, SPAWN_INSET, STABILITY_TICK_SECONDS } from "./config";

export interface FirstPersonControllerProps {
  dims: Dims;
  doors: DoorSpec[];
}

export function FirstPersonController({ dims, doors }: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const torch = useRef<THREE.PointLight>(null);
  const { yaw, pitch } = usePointerLook(gl.domElement, true, { initialPitch: 0, minPitch: -1.2, maxPitch: 1.2 });
  const pos = useRef(new THREE.Vector3(0, EYE_HEIGHT, dims.d / 2 - SPAWN_INSET));
  const input = useKeyboard(true);
  const setNearbyExit = useGame((s) => s.setNearbyExit);
  const seed = useGame((s) => s.room?.seed);
  const tickAcc = useRef(0);
  const move = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    pos.current.set(0, EYE_HEIGHT, dims.d / 2 - SPAWN_INSET);
    yaw.current = Math.PI;
    pitch.current = 0;
    tickAcc.current = 0;
  }, [seed, dims.d]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const idx = useGame.getState().nearbyExit;
      if (idx !== null) crossDoor(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (computeMoveDirection(yaw.current, input.current, move)) {
      pos.current.x += move.x * MOVE_SPEED * dt;
      pos.current.z += move.z * MOVE_SPEED * dt;
    }
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

    const near = nearestDoorIndex(doors, pos.current.x, pos.current.z, DOOR_RANGE);
    if (near !== useGame.getState().nearbyExit) setNearbyExit(near);

    if (torch.current) torch.current.position.copy(pos.current);

    tickAcc.current += dt;
    if (tickAcc.current >= STABILITY_TICK_SECONDS) {
      const beforeRoom = useGame.getState().room;
      useGame.getState().tickStability(tickAcc.current);
      tickAcc.current = 0;
      if (beforeRoom && !useGame.getState().room) playAlarm();
    }
  });

  return <pointLight ref={torch} intensity={5} distance={Math.max(dims.w, dims.d) * 0.9} decay={2} color="#9ff5cf" />;
}
