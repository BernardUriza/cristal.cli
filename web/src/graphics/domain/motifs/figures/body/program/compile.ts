import type { MorphPolicy } from "../../../../../config/morph.ts";
import { expandBody } from "../expand.ts";
import { sixSlotGraph } from "../sixSlot.ts";
import { BODY_TUNING, SIX_SLOT_PLAN, type SixSlot } from "../tuning.ts";
import { validateBody } from "../validate.ts";
import { BODY_FAMILIES, BodyGraphError, type BodyGraph } from "../types.ts";
import { applyOp, type OpState } from "./ops.ts";
import { posed } from "./pose.ts";
import { PROGRAM_LIMITS, type CompiledCreature, type CreatureOp, type CreatureProgram, type OpTrace } from "./types.ts";

const SIX_SLOTS: readonly string[] = SIX_SLOT_PLAN.map((s) => s.part);

const isSlotFill = (op: CreatureOp): op is Extract<CreatureOp, { op: "replace" }> => op.op === "replace" && SIX_SLOTS.indexOf(op.socket) >= 0;

/** The old six-slot recipe as a program: one replace per declared slot over the empty pivot plan. */
export function fromSixSlot(parts: Partial<Record<SixSlot, string>>): CreatureProgram {
  const operations: CreatureOp[] = SIX_SLOT_PLAN.filter((s) => parts[s.part]).map((s) => ({ op: "replace", socket: s.part, motif: parts[s.part]! }));
  return { family: "seis-ranuras", seed: 0, operations };
}

function base(p: CreatureProgram): { graph: BodyGraph; ops: CreatureOp[] } {
  if (p.family !== "seis-ranuras") {
    if (BODY_FAMILIES.indexOf(p.family) < 0) throw new BodyGraphError("unknown-family", String(p.family));
    return { graph: expandBody({ family: p.family, seed: p.seed }), ops: p.operations };
  }
  const k = p.operations.findIndex((op) => !isSlotFill(op));
  const fills = (k < 0 ? p.operations : p.operations.slice(0, k)) as Extract<CreatureOp, { op: "replace" }>[];
  const parts: Partial<Record<SixSlot, string>> = {};
  for (const f of fills) parts[f.socket as SixSlot] = f.motif;
  return { graph: sixSlotGraph(parts), ops: k < 0 ? [] : p.operations.slice(k) };
}

/** Family → semantic sockets → operations in order → validation; every failure is a BodyGraphError naming the operation. blend/caricature need the morph policy. */
export function compileProgram(program: CreatureProgram, morph?: MorphPolicy): CompiledCreature {
  if (!Array.isArray(program.operations)) throw new BodyGraphError("unknown-op", "operations must be a list");
  const { graph, ops } = base(program);
  if (ops.length > PROGRAM_LIMITS.operations) throw new BodyGraphError("too-many-ops", `${ops.length} operations (max ${PROGRAM_LIMITS.operations})`);
  const state: OpState = { graph, grammars: {}, seed: program.seed, index: 0, morph };
  const trace: OpTrace[] = [];
  ops.forEach((op, i) => {
    state.index = i;
    try {
      const r = applyOp(state, op);
      validateBody(state.graph, BODY_TUNING.budget);
      trace.push({ index: i + 1, op: op.op, socket: op.socket, ...r });
    } catch (err) {
      if (!(err instanceof BodyGraphError)) throw err;
      throw new BodyGraphError(err.code, `operación ${i + 1} (${op.op} ${op.socket}): ${err.message.replace(`${err.code}: `, "")}`);
    }
  });
  const applied = [...graph.applied, ...trace.map((t) => ({ rule: `op:${t.op}`, target: t.targets.join(","), origin: "program" as const, added: t.added }))];
  const done: BodyGraph = { ...graph, ...state.graph, applied };
  if (!program.pose) return { program, graph: done, grammars: state.grammars, trace };
  const pose = posed(done, program.pose);
  validateBody(pose, BODY_TUNING.budget);
  const added = pose.nodes.filter((n) => !done.nodes.some((m) => m.id === n.id)).map((n) => n.id);
  return { program, graph: { ...pose, applied: [...applied, { rule: "postura", target: pose.root, origin: "program", added }] }, grammars: state.grammars, trace };
}
