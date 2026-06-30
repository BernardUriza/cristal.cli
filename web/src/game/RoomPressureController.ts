import { clamp01 } from "../shared/math";

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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([
    lerp(ca[0], cb[0], t),
    lerp(ca[1], cb[1], t),
    lerp(ca[2], cb[2], t),
  ]);
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
