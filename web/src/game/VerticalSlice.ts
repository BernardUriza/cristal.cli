import { readJson, writeJson } from "../shared/storage";
import type { SymbolicArchetype } from "../shared/archetype";
import { parse } from "../terminal/inputParser";
import { SemanticSignalType } from "../terminal/types";

export type SliceStep =
  | "open_console"
  | "confess"
  | "invoke_glyph"
  | "cross_room"
  | "return_changed"
  | "complete";

export interface VerticalSliceState {
  step: SliceStep;
  confessed: boolean;
  confessionFragment: string | null;
  invokedGlyph: string | null;
  crossedRooms: number;
  falseDoors: number;
  completedRuns: number;
  lastSignal: string | null;
}

const STORAGE_KEY = "cristal.verticalSlice.v1";
const FRAGMENT_MAX_LENGTH = 64;

export const INITIAL_VERTICAL_SLICE: VerticalSliceState = {
  step: "open_console",
  confessed: false,
  confessionFragment: null,
  invokedGlyph: null,
  crossedRooms: 0,
  falseDoors: 0,
  completedRuns: 0,
  lastSignal: null,
};

export function objectiveForSlice(slice: VerticalSliceState): string {
  switch (slice.step) {
    case "open_console":
      return "Conecta una consola.";
    case "confess":
      return "Escribe una frase emocional, no un comando.";
    case "invoke_glyph":
      return "Invoca un glifo: LUNA, VISION o ROTURA.";
    case "cross_room":
      return "Cruza una puerta dentro del cuarto.";
    case "return_changed":
      return "Vuelve al laberinto con lo que cambió.";
    case "complete":
      return "Rito cerrado. Explora otro glifo si quieres abrir otra variación.";
  }
}

export function loadVerticalSlice(): VerticalSliceState {
  const saved = readJson(STORAGE_KEY);
  if (!saved || typeof saved !== "object") return INITIAL_VERTICAL_SLICE;
  const parsed = saved as Partial<VerticalSliceState>;
  return {
      ...INITIAL_VERTICAL_SLICE,
      ...parsed,
      step: normalizeStep(parsed.step),
      confessionFragment:
        typeof parsed.confessionFragment === "string"
          ? parsed.confessionFragment.slice(0, FRAGMENT_MAX_LENGTH)
          : null,
      invokedGlyph: typeof parsed.invokedGlyph === "string" ? parsed.invokedGlyph : null,
      crossedRooms: numberOrZero(parsed.crossedRooms),
      falseDoors: numberOrZero(parsed.falseDoors),
      completedRuns: numberOrZero(parsed.completedRuns),
      lastSignal: typeof parsed.lastSignal === "string" ? parsed.lastSignal : null,
    };
}

export function saveVerticalSlice(slice: VerticalSliceState): void {
  writeJson(STORAGE_KEY, slice);
}

export function noteConsoleOpened(slice: VerticalSliceState, label: string): VerticalSliceState {
  if (slice.step !== "open_console") return slice;
  return {
    ...slice,
    step: "confess",
    lastSignal: `${label} escucha. La siguiente entrada debe dejar una marca.`,
  };
}

export function noteConsoleInput(slice: VerticalSliceState, input: string): VerticalSliceState {
  if (slice.confessed) return slice;
  if (!looksLikeConfession(input)) return slice;
  const confessionFragment = toFragment(input);
  return {
    ...slice,
    confessed: true,
    confessionFragment,
    step: "invoke_glyph",
    lastSignal: `Confesión archivada: «${confessionFragment}». Los glifos responden con más gravedad.`,
  };
}

export function noteGlyphInvoked(
  slice: VerticalSliceState,
  glyphId: string,
  archetype: SymbolicArchetype
): VerticalSliceState {
  return {
    ...slice,
    step: "cross_room",
    invokedGlyph: glyphId,
    lastSignal: slice.confessionFragment
      ? `${archetype.toUpperCase()} respondió a «${slice.confessionFragment}». El cuarto ya lleva tu frase.`
      : `${archetype.toUpperCase()} abrió un cuarto. La arquitectura ya leyó tu frase.`,
  };
}

// Prompt payload for the room generator: the archived confession travels with
// every fresh descent so the server (or the local fallback inscription) can
// quote it back visibly inside the first room.
export function confessionFragmentsForRoom(slice: VerticalSliceState): string[] {
  return slice.confessionFragment ? [`confesión del jugador: ${slice.confessionFragment}`] : [];
}

export function noteFalseDoor(slice: VerticalSliceState): VerticalSliceState {
  return {
    ...slice,
    falseDoors: slice.falseDoors + 1,
    lastSignal: "La puerta falsa mordió. El mapa recordará ese cuarto como peligroso.",
  };
}

export function noteRoomCrossed(slice: VerticalSliceState, exitLabel: string): VerticalSliceState {
  const crossedRooms = slice.crossedRooms + 1;
  const firstThreshold = crossedRooms === 1 && slice.confessionFragment;
  return {
    ...slice,
    crossedRooms,
    step: "return_changed",
    lastSignal: firstThreshold
      ? `Cruzaste: ${exitLabel}. La primera puerta se abrió sobre «${slice.confessionFragment}».`
      : `Cruzaste: ${exitLabel}. El rito ya tiene una consecuencia completa.`,
  };
}

export function noteRoomDismissed(slice: VerticalSliceState): VerticalSliceState {
  if (slice.step !== "return_changed") return slice;
  return {
    ...slice,
    step: "complete",
    completedRuns: slice.completedRuns + 1,
    lastSignal: slice.confessionFragment
      ? `Regresas cambiado: «${slice.confessionFragment}» quedó archivada en el laberinto.`
      : "Vertical slice cerrada: confesión, glifo, cuarto, puerta y regreso.",
  };
}

export interface RunSummary {
  phrase: string | null;
  glyph: string | null;
  crossedRooms: number;
  falseDoors: number;
  completedRuns: number;
}

// Closing card data for the run: what the ritual actually consumed. Pure so the
// panel stays a dumb renderer and the closure is testable.
export function runSummary(slice: VerticalSliceState): RunSummary {
  return {
    phrase: slice.confessionFragment,
    glyph: slice.invokedGlyph,
    crossedRooms: slice.crossedRooms,
    falseDoors: slice.falseDoors,
    completedRuns: slice.completedRuns,
  };
}

// Opens the next variation of the rite: a fresh confession/glyph/threshold arc.
// Scoped reset — it clears only the slice's own per-run fields and keeps the
// completed-run tally; the terminal's memory lives under other storage keys and
// is never touched from here.
export function beginNextVariation(slice: VerticalSliceState): VerticalSliceState {
  if (slice.step !== "complete") return slice;
  return {
    ...INITIAL_VERTICAL_SLICE,
    completedRuns: slice.completedRuns,
    lastSignal: slice.confessionFragment
      ? `Variación ${slice.completedRuns + 1} abierta. «${slice.confessionFragment}» queda en el archivo; el rito espera otra frase.`
      : `Variación ${slice.completedRuns + 1} abierta. El rito espera otra frase.`,
  };
}

export interface AuthoredBeat {
  id: "confession" | "glyph" | "threshold";
  label: string;
  done: boolean;
}

// The short authored sequence, three beats max: archived confession -> the
// glyph answers -> the first door crossed / return changed. Pure so the panel
// stays a dumb renderer and the pacing is testable.
export function authoredBeats(slice: VerticalSliceState): AuthoredBeat[] {
  const glyphDone = slice.invokedGlyph !== null;
  const thresholdDone = slice.crossedRooms > 0;
  return [
    {
      id: "confession",
      label: slice.confessionFragment
        ? `confesión archivada: «${slice.confessionFragment}»`
        : "una frase tuya, archivada",
      done: slice.confessed,
    },
    {
      id: "glyph",
      label: glyphDone ? "el glifo respondió con tu frase" : "un glifo que responde",
      done: glyphDone,
    },
    {
      id: "threshold",
      label: thresholdDone ? "la primera puerta, cruzada: regresas cambiado" : "la primera puerta",
      done: thresholdDone,
    },
  ];
}

function toFragment(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, FRAGMENT_MAX_LENGTH);
}

// A confession is semantic input, never a terminal command. Delegates command
// detection to the canonical terminal parser so summon/save/load and every
// other known command stay out of the archive without a duplicated regex.
function looksLikeConfession(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 4) return false;
  const parsed = parse(trimmed);
  if (parsed.isCommand) return false;
  if (parsed.signalType === SemanticSignalType.Identity) return false;
  return true;
}

function normalizeStep(step: unknown): SliceStep {
  return [
    "open_console",
    "confess",
    "invoke_glyph",
    "cross_room",
    "return_changed",
    "complete",
  ].includes(String(step))
    ? (step as SliceStep)
    : INITIAL_VERTICAL_SLICE.step;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}
