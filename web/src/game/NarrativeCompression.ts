import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

export interface NarrativeCompressionInput {
  history: readonly EmotionalHistoryEntry[];
  relationship: RelationshipSnapshot;
  profile: TransferenceProfile;
}

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const;

function countWord(count: number): string {
  if (count >= 0 && count < NUMBER_WORDS.length) return NUMBER_WORDS[count];
  if (count < 100) return `${count}`;
  return "more than a hundred";
}

function dominantMovement(history: readonly EmotionalHistoryEntry[]): string {
  const counts = new Map<EmotionalHistoryEntry["stance"], number>();
  for (const entry of history) counts.set(entry.stance, (counts.get(entry.stance) ?? 0) + 1);
  const stance = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  switch (stance) {
    case "confession":
      return "describing what hurt";
    case "intellectualization":
      return "explaining your pain before touching it";
    case "anesthesia":
      return "making silence do the speaking";
    case "deflection":
      return "turning away just as the room began to answer";
    case "ritualization":
      return "building symbols around the thing you would not name";
    default:
      return "waiting for the labyrinth to learn your outline";
  }
}

function finalTurn(history: readonly EmotionalHistoryEntry[]): string {
  const last = history[history.length - 1];
  if (!last) return "and left the room without a final shape";
  if (last.stance === "confession") return "before finally describing it";
  if (isEvasiveStance(last.stance)) return "and ended by protecting the same threshold";
  return "and ended somewhere between refusal and recognition";
}

export function compressNarrative(input: NarrativeCompressionInput): string {
  if (input.history.length === 0) {
    return "You left no pattern behind, so the labyrinth can only remember the space where a pattern might begin.";
  }

  const rooms = new Set(input.history.map((entry) => entry.room.seed)).size;
  const movement = dominantMovement(input.history);
  const ending = finalTurn(input.history);
  const relationship =
    input.relationship.trust > input.relationship.resistance
      ? "It became gentler because trust had somewhere to gather"
      : "It became narrower because resistance taught it where to stand";
  const defense = input.profile.dominantDefense
    ? ` It now recognizes ${input.profile.dominantDefense} as one of your shelters.`
    : "";

  return `You spent ${countWord(rooms)} rooms ${movement} ${ending}. ${relationship}.${defense}`.replace(
    /\s+/g,
    " "
  );
}
