import { MOTIFS } from "../../index.ts";
import { BODY_FAMILIES, type BodyFamily } from "../types.ts";
import { semanticName } from "./sockets.ts";
import { ARRANGEMENTS, GRAMMARS, OPS, PROGRAM_LIMITS, type CreatureOp, type CreatureProgram } from "./types.ts";

export type ProgramReading = { program: CreatureProgram } | { rejected: string };

const isIn = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).indexOf(v) >= 0;

function opOf(raw: unknown, i: number): CreatureOp | string {
  if (typeof raw !== "object" || raw === null) return `operación ${i + 1} no es un objeto`;
  const r = raw as Record<string, unknown>;
  if (!isIn(OPS, r.op)) return `operación ${i + 1}: «${String(r.op)}» no es replace|graft|repeat|architecturalize`;
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
