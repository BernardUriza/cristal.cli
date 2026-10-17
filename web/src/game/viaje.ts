import { clamp01 } from "../shared/math";

export const AUTOWALK_IDLE_MS = 6000;
export const REWARD_FULL_AT = 8;
const STORAGE_KEY = "cristal.viaje.v1";

export interface ViajeAtmosphere {
  fogFar: number;
  ambient: number;
  hemisphere: number;
}

export function rewardLevel(inscriptions: number): number {
  return clamp01(inscriptions / REWARD_FULL_AT);
}

export function viajeAtmosphere(level: number): ViajeAtmosphere {
  const t = clamp01(level);
  return { fogFar: 34 + t * 26, ambient: 0.6 + t * 0.5, hemisphere: 0.8 + t * 0.6 };
}

export function isIdle(lastActivityAt: number, now: number, idleMs = AUTOWALK_IDLE_MS): boolean {
  return now - lastActivityAt >= idleMs;
}

export function viajeFromSearch(search: string): boolean | null {
  const value = new URLSearchParams(search).get("viaje");
  if (value === null) return null;
  return value !== "0" && value !== "off" && value !== "false";
}

export function loadViaje(search: string): boolean {
  const fromUrl = viajeFromSearch(search);
  if (fromUrl !== null) return fromUrl;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveViaje(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    return;
  }
}
