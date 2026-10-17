import { readCreatureProgram } from "../domain/motifs/figures/body/program/sanitize.ts";
import type { CreatureProgram } from "../domain/motifs/figures/body/program/types.ts";

export const BODY_PARTS = ["cabeza", "ojos", "cuerpo", "manos", "cola", "pies"] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export const SCENE_MOTIFS = ["ojo", "mano", "craneo", "perro", "jaguar", "escalera", "mascara", "sirena"] as const;
export type SceneMotif = (typeof SCENE_MOTIFS)[number];

export const ARRANGEMENTS = ["fila", "circulo", "espiral", "escalera", "reticula", "procesion", "corona"] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export const PLACES = ["patio", "azoteas", "torres", "cielo", "escalera"] as const;
export type Place = (typeof PLACES)[number];

export type Creature = { name: string; parts: Partial<Record<BodyPart, SceneMotif>> };

export type Group = { creature: Creature; count: number; arrangement: Arrangement; place: Place; scale: number; program?: CreatureProgram; programRejected?: string };

const PROGRAM_FALLBACK_PARTS: Creature["parts"] = { cuerpo: "mascara" };

export const FOOTPRINTS = ["cuadrado", "alargado", "profundo"] as const;
export const COURTYARDS = ["chico", "medio", "grande"] as const;
export const HEIGHTS = ["bajo", "medio", "alto", "vertiginoso"] as const;

export type ArchitectureSpec = {
  footprint: (typeof FOOTPRINTS)[number];
  courtyard: (typeof COURTYARDS)[number];
  heights: (typeof HEIGHTS)[number];
};

export type Scene = { groups: Group[]; architecture: ArchitectureSpec };

export const SCENE_LIMITS = { groups: 3, count: 24, scaleMin: 0.4, scaleMax: 2.5 } as const;

export const DEFAULT_ARCHITECTURE: ArchitectureSpec = { footprint: "cuadrado", courtyard: "medio", heights: "medio" };


const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

export function sanitizeScene(raw: unknown): Scene | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as { groups?: unknown; architecture?: Partial<Record<keyof ArchitectureSpec, unknown>> };
  const groups: Group[] = [];
  for (const g of Array.isArray(r.groups) ? r.groups : []) {
    if (groups.length === SCENE_LIMITS.groups || typeof g !== "object" || g === null) continue;
    const gg = g as Record<string, unknown>;
    const c = (gg.creature ?? {}) as { name?: unknown; parts?: Record<string, unknown> };
    const parts: Creature["parts"] = {};
    for (const part of BODY_PARTS) if (isOneOf(SCENE_MOTIFS, c.parts?.[part])) parts[part] = c.parts![part] as SceneMotif;
    const reading = gg.program === undefined ? undefined : readCreatureProgram(gg.program);
    const program = reading && "program" in reading ? reading.program : undefined;
    if (Object.keys(parts).length === 0 && !program) continue;
    const count = Math.round(Number(gg.count));
    const scale = Number(gg.scale ?? 1);
    groups.push({
      creature: { name: typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 40) : "figura", parts: Object.keys(parts).length ? parts : PROGRAM_FALLBACK_PARTS },
      count: Number.isFinite(count) ? Math.max(1, Math.min(SCENE_LIMITS.count, count)) : 1,
      arrangement: isOneOf(ARRANGEMENTS, gg.arrangement) ? gg.arrangement : "fila",
      place: isOneOf(PLACES, gg.place) ? gg.place : "patio",
      scale: Number.isFinite(scale) ? Math.max(SCENE_LIMITS.scaleMin, Math.min(SCENE_LIMITS.scaleMax, scale)) : 1,
      ...(program ? { program } : {}),
      ...(reading && "rejected" in reading ? { programRejected: reading.rejected } : {}),
    });
  }
  const a = r.architecture ?? {};
  return {
    groups,
    architecture: {
      footprint: isOneOf(FOOTPRINTS, a.footprint) ? a.footprint : DEFAULT_ARCHITECTURE.footprint,
      courtyard: isOneOf(COURTYARDS, a.courtyard) ? a.courtyard : DEFAULT_ARCHITECTURE.courtyard,
      heights: isOneOf(HEIGHTS, a.heights) ? a.heights : DEFAULT_ARCHITECTURE.heights,
    },
  };
}
