import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

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
      yaw.current -= e.movementX * 0.0025;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0025, minPitch, maxPitch);
    };
    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
    };
  }, [canvas, enabled, minPitch, maxPitch]);

  return { yaw, pitch };
}
