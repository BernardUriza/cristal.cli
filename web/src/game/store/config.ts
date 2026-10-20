export const HISTORY_LIMIT = 8;
export const FALSE_DOOR_HISTORY_LIMIT = 12;
export const ROOM_CACHE_LIMIT = 64;
export const TRANSITION_MS = 500;
export const STARVATION_ACCENT = "#7dffd0";
export const ECHO_ACCENT = "#c879ff";
export const STARVATION_FALLBACK: readonly string[] = [
  "alguien pasó por aquí",
  "todavía no has dicho nada",
  "las paredes esperan una palabra",
];
export const SPIKE_DECAY_PER_SECOND = 0.14;
export const SPIKE_DECAY_DURING_ENDING = 0.8;
export { GOLDEN_RATIO_HASH } from "../../shared/rng";
