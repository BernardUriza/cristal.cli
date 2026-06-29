import type { Room } from "./roomApi";

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const LOW_STABILITY = 40;
const CRITICAL_STABILITY = 20;
const MODERATE_DANGER = 50;
const HIGH_DANGER = 75;
const VERY_HIGH_DANGER = 85;
const REVISIT_PENALTY = 15;

export type RoomAction = "explore" | "rush" | "avoid" | "exit-now";

export interface RoomDangerProfile {
  dangerScore: number;
  tags: string[];
  recommendedAction: RoomAction;
}

function clamp(value: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, value));
}

function hasVisitedSeed(room: Room, history: readonly Room[]): boolean {
  return history.some((visited) => visited.seed === room.seed);
}

function tagsForRoom(room: Room, stability: number, isRevisit: boolean): string[] {
  const tags: string[] = [];

  if (room.dread >= HIGH_DANGER) tags.push("high-dread");
  if (stability <= LOW_STABILITY) tags.push("low-stability");
  if (isRevisit) tags.push("revisit");
  if (room.exits.length <= 1) tags.push("dead-end");
  if (room.exits.length >= 3) tags.push("branching");

  return tags;
}

function actionFor(dangerScore: number, stability: number): RoomAction {
  if (stability <= CRITICAL_STABILITY && dangerScore >= HIGH_DANGER) return "exit-now";
  if (dangerScore >= VERY_HIGH_DANGER && stability > CRITICAL_STABILITY) return "avoid";
  if (dangerScore >= MODERATE_DANGER && stability <= LOW_STABILITY) return "rush";
  return "explore";
}

export function profileRoomDanger(
  room: Room,
  stability: number,
  history: readonly Room[],
): RoomDangerProfile {
  const stableHeadroomPressure = MAX_SCORE - clamp(stability);
  const isRevisit = hasVisitedSeed(room, history);

  const dangerScore = clamp(
    Math.round(
      room.dread * 0.8 +
        stableHeadroomPressure * 0.3 +
        (isRevisit ? REVISIT_PENALTY : 0),
    ),
  );

  return {
    dangerScore,
    tags: tagsForRoom(room, stability, isRevisit),
    recommendedAction: actionFor(dangerScore, stability),
  };
}
