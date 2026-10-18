import { MOTIFS } from "../../index.ts";
import { BODY_FAMILIES, type BodyFamily } from "../types.ts";
import { REGIONS, type Region } from "../../regions.ts";
import { semanticName } from "./sockets.ts";
import { ARRANGEMENTS, GRAMMARS, OPS, PROGRAM_LIMITS, type CreatureOp, type CreatureProgram } from "./types.ts";

export type ProgramReading = { program: CreatureProgram } | { rejected: string };

const REGION_ALIASES: Record<string, Region> = { cola: "punta", torso: "tronco", cuerpo: "tronco", patas: "extremidad", piernas: "extremidad", head: "cabeza", tail: "punta" };

const regionOf = (v: unknown): Region | undefined => (typeof v !== "string" ? undefined : (REGIONS as readonly string[]).indexOf(v) >= 0 ? (v as Region) : REGION_ALIASES[v.trim().toLowerCase()]);

const isIn = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).indexOf(v) >= 0;

function opOf(raw: unknown, i: number): CreatureOp | string {
  if (typeof raw !== "object" || raw === null) return `operación ${i + 1} no es un objeto`;
  const r = raw as Record<string, unknown>;
  if (!isIn(OPS, r.op)) return `operación ${i + 1}: «${String(r.op)}» no es ${OPS.join("|")}`;
  if (typeof r.socket !== "string" || !semanticName(r.socket)) return `operación ${i + 1}: socket «${String(r.socket)}» no existe`;
  const socket = semanticName(r.socket)!;
  if (r.op === "replace") return typeof r.motif === "string" && MOTIFS[r.motif] ? { op: "replace", socket, motif: r.motif } : `operación ${i + 1}: motivo «${String(r.motif)}» no está en la pared`;
  if (r.op === "graft") {
    if (!isIn(BODY_FAMILIES, r.family)) return `operación ${i + 1}: familia «${String(r.family)}» desconocida`;
    return typeof r.part === "string" && semanticName(r.part) ? { op: "graft", socket, family: r.family as BodyFamily, part: semanticName(r.part)! } : `operación ${i + 1}: parte «${String(r.part)}» no existe`;
  }
  if (r.op === "repeat") {
    const count = Number(r.count);
    if (!Number.isInteger(count) || count < PROGRAM_LIMITS.countMin || count > PROGRAM_LIMITS.countMax) return `operación ${i + 1}: count=${String(r.count)} fuera de ${PROGRAM_LIMITS.countMin}..${PROGRAM_LIMITS.countMax}`;
    return isIn(ARRANGEMENTS, r.arrangement) ? { op: "repeat", socket, count, arrangement: r.arrangement } : `operación ${i + 1}: arreglo «${String(r.arrangement)}» desconocido`;
  }
  if (r.op === "blend") {
    if (typeof r.motif !== "string" || !MOTIFS[r.motif]) return `operación ${i + 1}: motivo «${String(r.motif)}» no está en la pared`;
    const region = regionOf(r.region);
    if (!region) return `operación ${i + 1}: región «${String(r.region)}» no es ${REGIONS.join("|")}`;
    const weight = Number(r.weight);
    return typeof r.weight === "number" && weight > 0 && weight <= 1 ? { op: "blend", socket, motif: r.motif, region, weight } : `operación ${i + 1}: peso=${String(r.weight)} fuera de (0, 1]`;
  }
  if (r.op === "caricature") {
    const k = r.k;
    return typeof k === "number" && k >= PROGRAM_LIMITS.kMin && k <= PROGRAM_LIMITS.kMax ? { op: "caricature", socket, k } : `operación ${i + 1}: k=${String(k)} fuera de ${PROGRAM_LIMITS.kMin}..${PROGRAM_LIMITS.kMax}`;
  }
  return isIn(GRAMMARS, r.grammar) ? { op: "architecturalize", socket, grammar: r.grammar } : `operación ${i + 1}: gramática «${String(r.grammar)}» desconocida`;
}

/** Shape check of a program written by someone else (Pedro, a recipe); one bad operation rejects the whole program, with the reason. */
export function readCreatureProgram(raw: unknown, fallbackSeed = 1): ProgramReading {
  if (typeof raw !== "object" || raw === null) return { rejected: "el programa no es un objeto" };
  const r = raw as Record<string, unknown>;
  if (!isIn(BODY_FAMILIES, r.family)) return { rejected: `familia «${String(r.family)}» desconocida` };
  const ops = r.operations === undefined ? [] : r.operations;
  if (!Array.isArray(ops)) return { rejected: "operations no es una lista" };
  if (ops.length > PROGRAM_LIMITS.operations) return { rejected: `${ops.length} operaciones (máximo ${PROGRAM_LIMITS.operations})` };
  const operations: CreatureOp[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = opOf(ops[i], i);
    if (typeof op === "string") return { rejected: op };
    operations.push(op);
  }
  const seed = Number(r.seed);
  return { program: { family: r.family as BodyFamily, seed: Number.isInteger(seed) && seed >= 0 ? seed : fallbackSeed, operations } };
}
