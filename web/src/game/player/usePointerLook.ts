import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useGame } from "../store";
import { markInputActivity } from "../inputActivity";

export interface PointerLook {
  yaw: MutableRefObject<number>;
  pitch: MutableRefObject<number>;
}

export interface PointerLookOptions {
  initialYaw?: number;
  initialPitch?: number;
  minPitch?: number;
  maxPitch?: number;
}

// Pointer-lock mouse look. Locks on canvas click while enabled; yaw/pitch are
// refs so the frame loop reads them without re-renders.
export function usePointerLook(
  canvas: HTMLCanvasElement,
  enabled: boolean,
  { initialYaw = 0, initialPitch = 0.25, minPitch = -0.4, maxPitch = 0.9 }: PointerLookOptions = {}
): PointerLook {
  const yaw = useRef(initialYaw);
  const pitch = useRef(initialPitch);

  useEffect(() => {
    const onClick = () => {
      if (enabled) canvas.requestPointerLock();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      markInputActivity(Date.now());
      yaw.current -= e.movementX * 0.0025;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0025, minPitch, maxPitch);
    };
    const onLockChange = () => {
      if (document.pointerLockElement === canvas) useGame.getState().reachFunnel("pointer_lock", Date.now());
    };
    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [canvas, enabled, minPitch, maxPitch]);

  return { yaw, pitch };
}
