import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLASH_OMEGA } from "../flashSafety";
import type { RoomPressureAtmosphere } from "../RoomPressureController";
import { dreadFraction } from "./atmosphere";
import { FLICKER_DREAD_THRESHOLD } from "./config";
import type { Dims } from "./geometry";

export interface CeilingLightProps {
  dims: Dims;
  dread: number;
  color: THREE.Color;
  pressure: RoomPressureAtmosphere;
}

export function CeilingLight({ dims, dread, color, pressure }: CeilingLightProps) {
  const ref = useRef<THREE.PointLight>(null);
  const t = dreadFraction(dread);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = clock.elapsedTime;
    const slow = Math.sin(time * (1 + t * 3));
    const flicker = t > FLICKER_DREAD_THRESHOLD ? Math.sin(time * FLASH_OMEGA) * (t - FLICKER_DREAD_THRESHOLD) * 0.5 : 0;
    const pressureFlicker = Math.sin(time * FLASH_OMEGA * 0.8) * pressure.lightInstability * 0.45;
    ref.current.intensity = 2.0 + slow * (0.3 + t * 0.6 + pressure.wallPulse * 0.35) + flicker + pressureFlicker;
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
