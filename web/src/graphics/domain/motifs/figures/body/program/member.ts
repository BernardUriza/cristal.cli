import { fnv1a, mulberry32, pick, shuffle, type Rng } from "../../../../../../shared/rng.ts";
import type { MemberVariation, MinorOp } from "../../../../../config/variation.ts";
import { CHIMERIC_SLOTS } from "../tuning.ts";
import { PROGRAM_LIMITS, type CreatureOp, type CreatureProgram } from "./types.ts";

export type MemberProgram = { program: CreatureProgram; heightScale: number; notes: string[] };

export type Fits = (p: CreatureProgram) => boolean;

const within = (rng: Rng, [a, b]: readonly [number, number]): number => a + rng() * (b - a);

const motifsOf = (ops: readonly CreatureOp[]): string[] => [...new Set(ops.flatMap((o) => (o.op === "replace" ? [o.motif] : [])))];

function reseeded(base: CreatureProgram, seed: number, v: MemberVariation, fits: Fits): { program: CreatureProgram; note: string } {
  for (let k = 0; k < v.seedTries; k++) {
    const program = { ...base, seed: fnv1a(`${seed}:${k}`) % v.seedSpace };
    if (fits(program)) return { program, note: `#${program.seed}` };
  }
  const kept: CreatureOp[] = [];
  const program = { ...base, seed: fnv1a(`${seed}:0`) % v.seedSpace };
  for (const op of base.operations) if (fits({ ...program, operations: [...kept, op] })) kept.push(op);
  return { program: { ...program, operations: kept }, note: `#${program.seed} sin ${base.operations.length - kept.length} operación(es) del grupo que este cuerpo no toma` };
}

/** A chimera's free slots are filled from the group's own motifs, so the mixture changes but stays the group's. */
function chimeraFills(p: CreatureProgram, rng: Rng, fits: Fits): CreatureProgram {
  const own = motifsOf(p.operations);
  if (p.family !== "chimera" || !own.length) return p;
  const taken = new Set(p.operations.filter((o) => o.op === "replace").map((o) => o.socket));
  let out = p;
  for (const socket of CHIMERIC_SLOTS.filter((s) => !taken.has(s))) {
    const next = { ...out, operations: [{ op: "replace" as const, socket, motif: pick(rng, own) }, ...out.operations] };
    if (next.operations.length <= PROGRAM_LIMITS.operations && fits(next)) out = next;
  }
  return out;
}

function concrete(m: MinorOp, rng: Rng): CreatureOp {
  if (m.op === "caricature") return { op: "caricature", socket: m.socket, k: Number(within(rng, m.k).toFixed(2)) };
  return { op: "repeat", socket: m.socket, count: Math.round(within(rng, m.count)), arrangement: m.arrangement };
}

function minor(p: CreatureProgram, rng: Rng, v: MemberVariation, fits: Fits): { program: CreatureProgram; note?: string } {
  if (rng() >= v.minorShare || p.operations.length >= PROGRAM_LIMITS.operations) return { program: p };
  for (const m of shuffle(v.minorOps, rng)) {
    const op = concrete(m, rng);
    const next = { ...p, operations: [...p.operations, op] };
    if (fits(next)) return { program: next, note: `${op.op} ${op.socket}${op.op === "caricature" ? ` k${op.k}` : op.op === "repeat" ? ` ×${op.count}` : ""}` };
  }
  return { program: p };
}

/** One member of a group: its own seed (proportions and L1–L4 remates of the family), the group's operations kept, and maybe one seeded minor operation. */
export function memberProgram(base: CreatureProgram, seed: number, v: MemberVariation, fits: Fits): MemberProgram {
  const rng = mulberry32(seed);
  const heightScale = Number(within(rng, v.height).toFixed(3));
  const start = base.family === "seis-ranuras" ? { program: base, note: "seis ranuras" } : reseeded(base, seed, v, fits);
  const mixed = chimeraFills(start.program, rng, fits);
  const tweaked = minor(mixed, rng, v, fits);
  return { program: tweaked.program, heightScale, notes: [start.note, ...(tweaked.note ? [tweaked.note] : [])] };
}
