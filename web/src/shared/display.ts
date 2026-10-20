export const MAX_DEVICE_SCALE = 2;

export function deviceScale(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(MAX_DEVICE_SCALE, window.devicePixelRatio || 1);
}
