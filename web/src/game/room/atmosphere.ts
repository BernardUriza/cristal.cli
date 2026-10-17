export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Atmosphere {
  fogColor: Rgb;
  wallColor: Rgb;
  fogNear: number;
  fogFar: number;
  ambient: number;
}

export const MIN_AMBIENT = 0.58;

function srgbToLinear(c: number): number {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

export function hexToLinearRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return {
    r: srgbToLinear(((n >> 16) & 255) / 255),
    g: srgbToLinear(((n >> 8) & 255) / 255),
    b: srgbToLinear((n & 255) / 255),
  };
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

const CALM = hexToLinearRgb("#06140d");
const TERROR = hexToLinearRgb("#1a0604");
const LISTENING = hexToLinearRgb("#10271f");
const WALL_CALM = hexToLinearRgb("#1c3024");
const WALL_TERROR = hexToLinearRgb("#42241d");

export function dreadFraction(dread: number): number {
  return Math.max(0, Math.min(100, dread)) / 100;
}

export function atmosphere(dread: number, lightingBias = 0.42, fogBias = 0, seasonRefusal = 0): Atmosphere {
  const t = dreadFraction(dread);
  const fogColor = lerpRgb(lerpRgb(CALM, TERROR, t + seasonRefusal * 0.18), LISTENING, lightingBias * 0.18);
  const wallColor = lerpRgb(WALL_CALM, WALL_TERROR, t + seasonRefusal * 0.12);
  const fogNear = 5 + (1 - t) * 6 - fogBias * 2.2;
  const fogFar = 22 + (1 - t) * 30 - fogBias * 8;
  const ambient = Math.max(MIN_AMBIENT, 0.92 + lightingBias * 0.36 - t * 0.26 - seasonRefusal * 0.08);
  return { fogColor, wallColor, fogNear, fogFar, ambient };
}
