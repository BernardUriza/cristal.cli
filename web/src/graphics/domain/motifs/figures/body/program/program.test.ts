import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../../../shared/rng.ts";
import { drawCreature, drawProgram } from "../../creature.ts";
import { MORPH_POLICY } from "../../../../../config/morph.ts";
import { isSimple } from "../../../morph/intersect.ts";
import { BodyGraphError } from "../types.ts";
import { compileProgram, fromSixSlot } from "./compile.ts";
import { readCreatureProgram } from "./sanitize.ts";
import { resolveSocket } from "./sockets.ts";
import type { CreatureProgram } from "./types.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

const ASTRA: CreatureProgram = {
  family: "quadruped",
  seed: 8172,
  operations: [
    { op: "replace", socket: "head", motif: "craneo" },
    { op: "graft", socket: "tail", family: "serpentine", part: "tail" },
    { op: "architecturalize", socket: "torso", grammar: "facade" },
  ],
};

const codeOf = (f: () => unknown): string => {
  try {
    f();
    return "ok";
  } catch (err) {
    return err instanceof BodyGraphError ? err.code : "other";
  }
};

describe("CreatureProgram", () => {
  it("runs the example from the spec: skull head, serpentine tail grafted, torso as facade, one trace per operation", () => {
    const c = compileProgram(ASTRA);
    expect(c.trace.map((t) => t.op)).toEqual(["replace", "graft", "architecturalize"]);
    expect(resolveSocket(c.graph, "head").every((n) => "motif" in n.kind && n.kind.motif === "craneo")).toBe(true);
    const tail = c.graph.edges.find((e) => e.to.startsWith("g2/"))!;
    expect(tail.recursion!.times).toBeGreaterThanOrEqual(6);
    expect(c.trace[1].removed.length).toBeGreaterThan(0);
    expect(Object.values(c.grammars)).toEqual(["facade"]);
    const drawn = drawProgram(ASTRA, 100, 300, 200, P, mulberry32(1));
    expect(drawn.pieces.filter((p) => p.grammar === "facade")).toHaveLength(1);
    expect(drawn.provenance.decision).toContain("2. graft tail");
  });

  it("repeat multiplies a limb radially, in a chain or in bilateral pairs, inside the budget", () => {
    const arms = (arrangement: "radial" | "chain" | "bilateral") => compileProgram({ family: "biped", seed: 4, operations: [{ op: "repeat", socket: "arm", count: 4, arrangement }] });
    expect(resolveSocket(arms("bilateral").graph, "arm")).toHaveLength(4);
    expect(resolveSocket(arms("radial").graph, "arm")).toHaveLength(4);
    const chain = arms("chain").graph;
    const arm = resolveSocket(chain, "arm")[0].id;
    expect(chain.edges.find((e) => e.to === arm)!.recursion!.times).toBe(4);
  });

  it("is deterministic and different families give different bodies", () => {
    const a = JSON.stringify(drawProgram(ASTRA, 0, 0, 100, P, mulberry32(3)));
    expect(JSON.stringify(drawProgram(ASTRA, 0, 0, 100, P, mulberry32(3)))).toBe(a);
    expect(JSON.stringify(drawProgram({ ...ASTRA, family: "biped" }, 0, 0, 100, P, mulberry32(3)))).not.toBe(a);
  });

  it("fails with typed errors: missing socket, unknown motif, bad count, budget, too many operations", () => {
    expect(codeOf(() => compileProgram({ family: "serpentine", seed: 1, operations: [{ op: "repeat", socket: "arm", count: 3, arrangement: "radial" }] }))).toBe("missing-socket");
    expect(codeOf(() => compileProgram({ family: "biped", seed: 1, operations: [{ op: "replace", socket: "head", motif: "dragon" }] }))).toBe("unknown-kind");
    expect(codeOf(() => compileProgram({ family: "biped", seed: 1, operations: [{ op: "repeat", socket: "arm", count: 40, arrangement: "radial" }] }))).toBe("bad-count");
    expect(codeOf(() => compileProgram({ family: "radial", seed: 1, operations: [{ op: "repeat", socket: "arm", count: 8, arrangement: "bilateral" }] }))).toBe("budget-exceeded");
    const seven = Array.from({ length: 7 }, () => ({ op: "replace" as const, socket: "head", motif: "ojo" }));
    expect(codeOf(() => compileProgram({ family: "biped", seed: 1, operations: seven }))).toBe("too-many-ops");
  });

  it("the old six-slot plan is a program whose output is identical to the plan itself", () => {
    const parts = { cabeza: "craneo", ojos: "ojo", cuerpo: "escalera", manos: "mano" } as const;
    expect(fromSixSlot(parts).operations.map((o) => o.socket)).toEqual(["pies", "cuerpo", "manos", "cabeza", "ojos"].filter((s) => s in parts));
    const plan = drawCreature(parts, 100, 300, 200, P, mulberry32(1));
    expect(plan.provenance.algorithm).toContain("plan corporal fijo");
    const built = compileProgram({ ...fromSixSlot(parts), operations: [...fromSixSlot(parts).operations, { op: "architecturalize", socket: "cuerpo", grammar: "tower" }] });
    expect(built.grammars).toEqual({ cuerpo: "tower" });
  });

  it("blend swaps the socket's piece for a region hybrid and caricature exaggerates it, each with its own provenance", () => {
    const program: CreatureProgram = { family: "quadruped", seed: 8172, operations: [
      { op: "replace", socket: "torso", motif: "jaguar" },
      { op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 1 },
      { op: "caricature", socket: "torso", k: 1.6 },
    ] };
    const c = compileProgram(program, MORPH_POLICY);
    const torso = resolveSocket(c.graph, "torso")[0];
    expect("motif" in torso.kind && torso.kind.motif).toBe("jaguar");
    const morph = "motif" in torso.kind ? torso.kind.morph! : undefined;
    expect(morph!.label).toMatch(/^jaguar⊕sirena\[punta 1\]~k/);
    expect(isSimple(morph!.contour)).toBe(true);
    expect(c.trace[1].morph).toContain("jaguar⊕sirena[punta 1]");
    expect(c.trace[2].morph).toContain("norma:animales");
    const drawn = drawProgram(program, 100, 300, 200, P, mulberry32(1), MORPH_POLICY);
    expect(drawn.provenance.decision).toContain("2. blend torso: torso ← jaguar⊕sirena[punta 1]");
    expect(drawn.pieces.find((p) => p.slot === torso.id)!.part.mask).toHaveLength(morph!.contour.length);
  });

  it("blend and caricature fail with typed errors", () => {
    const run = (ops: CreatureProgram["operations"], morph = MORPH_POLICY) => codeOf(() => compileProgram({ family: "quadruped", seed: 1, operations: ops }, morph));
    const torso = { op: "replace" as const, socket: "torso", motif: "jaguar" };
    expect(run([torso, { op: "blend", socket: "torso", motif: "dragon", region: "punta", weight: 1 }])).toBe("unknown-kind");
    expect(run([torso, { op: "blend", socket: "torso", motif: "sirena", region: "ala" as never, weight: 1 }])).toBe("unknown-region");
    expect(run([torso, { op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 1.5 }])).toBe("bad-weight");
    expect(run([torso, { op: "blend", socket: "torso", motif: "jaguar", region: "punta", weight: 1 }])).toBe("blend-conflict");
    expect(run([torso, { op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 1 }, { op: "blend", socket: "torso", motif: "perro", region: "cabeza", weight: 1 }])).toBe("blend-conflict");
    expect(run([torso, { op: "caricature", socket: "torso", k: 4 }])).toBe("bad-k");
    expect(run([{ op: "caricature", socket: "eye", k: 1.5 }])).toBe("missing-socket");
    expect(run([{ op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 1 }])).toBe("not-a-motif");
    expect(codeOf(() => compileProgram({ family: "radial", seed: 1, operations: [{ op: "caricature", socket: "torso", k: 1.5 }] }, MORPH_POLICY))).toBe("ok");
    expect(codeOf(() => compileProgram({ family: "quadruped", seed: 1, operations: [torso, { op: "caricature", socket: "torso", k: 1.5 }] }))).toBe("no-morph-policy");
  });

  it("reads blend and caricature from someone else, with region aliases, and rejects bad weights and k", () => {
    const ok = readCreatureProgram({ family: "quadruped", seed: 2, operations: [{ op: "replace", socket: "cuerpo", motif: "jaguar" }, { op: "blend", socket: "cuerpo", motif: "sirena", region: "cola", weight: 0.8 }, { op: "caricature", socket: "cuerpo", k: 1.4 }] });
    expect("program" in ok && ok.program.operations.slice(1)).toEqual([{ op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 0.8 }, { op: "caricature", socket: "torso", k: 1.4 }]);
    const reject = (op: object) => readCreatureProgram({ family: "biped", operations: [op] });
    expect("rejected" in reject({ op: "blend", socket: "head", motif: "sirena", region: "punta", weight: 0 })).toBe(true);
    expect("rejected" in reject({ op: "blend", socket: "head", motif: "sirena", region: "ala", weight: 1 })).toBe(true);
    expect("rejected" in reject({ op: "caricature", socket: "head", k: "2" })).toBe(true);
    expect("rejected" in reject({ op: "caricature", socket: "head", k: 9 })).toBe(true);
  });

  it("reads a program written by someone else and rejects it whole on one bad operation", () => {
    const ok = readCreatureProgram({ family: "radial", seed: 9, operations: [{ op: "repeat", socket: "brazos", count: 3, arrangement: "chain" }] });
    expect("program" in ok && ok.program.operations[0].socket).toBe("arm");
    const bad = readCreatureProgram({ family: "biped", seed: 9, operations: [{ op: "replace", socket: "head", motif: "ojo" }, { op: "explode", socket: "head" }] });
    expect("rejected" in bad && bad.rejected).toContain("operación 2");
    expect("rejected" in readCreatureProgram({ family: "dragon" })).toBe(true);
  });
});
