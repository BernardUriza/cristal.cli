import { flagStore } from "../shared/storage";
import { clamp01 } from "../shared/math";
import { flagParam } from "../shared/url";

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

const viajeFlag = flagStore(STORAGE_KEY, false);

export function viajeFromSearch(search?: string): boolean | null {
  return flagParam("viaje", search);
}

export function loadViaje(search?: string): boolean {
  const fromUrl = viajeFromSearch(search);
  return fromUrl ?? viajeFlag.load();
}

export function saveViaje(on: boolean): void {
  viajeFlag.save(on);
}
