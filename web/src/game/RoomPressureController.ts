import { mixHex } from "../shared/color";
import { clamp01, lerp, smoothstep } from "../shared/math";

export interface RoomPressureAtmosphere {
  pressure: number;
  fogDensity: number;
  lightInstability: number;
  wallPulse: number;
  portalGlow: number;
  vignetteAmount: number;
  ambientColor: string;
}

export interface RoomPressureInput {
  pressure: number;
}

export function resolveRoomPressureAtmosphere(
  input: RoomPressureInput
): RoomPressureAtmosphere {
  const pressure = clamp01(input.pressure);
  const breathing = smoothstep(0.18, 0.58, pressure);
  const hostile = smoothstep(0.62, 1, pressure);

  return {
    pressure,
    fogDensity: lerp(0.08, 0.82, smoothstep(0.1, 1, pressure)),
    lightInstability: lerp(0.03, 0.92, smoothstep(0.28, 0.96, pressure)),
    wallPulse: lerp(0.02, 0.8, breathing * 0.7 + hostile * 0.3),
    portalGlow: lerp(1.08, 0.62, smoothstep(0.12, 0.88, pressure)),
    vignetteAmount: lerp(0.04, 0.58, smoothstep(0.24, 1, pressure)),
    ambientColor: mixHex("#2e6b55", "#3d1614", smoothstep(0.15, 0.95, pressure)),
  };
}
