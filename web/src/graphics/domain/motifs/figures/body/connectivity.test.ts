import { describe, expect, it } from "vitest";
import { MORPH_POLICY } from "../../../../config/morph.ts";
import { MEMBER_VARIATION } from "../../../../config/variation.ts";
import { fnv1a } from "../../../../../shared/rng.ts";
import { silhouetteComponents } from "./connectivity.ts";
import { compileProgram } from "./program/compile.ts";
import { memberProgram } from "./program/member.ts";
import type { CreatureOp, CreatureProgram } from "./program/types.ts";
import { BODY_FAMILIES, type BodyFamily } from "./types.ts";

const RECIPES: Record<string, Array<[string, string]>> = {
  propia: [],
  calaca: [["torso", "escalera"], ["head", "craneo"], ["hand", "mano"], ["foot", "mano"]],
  robot: [["head", "craneo"], ["eye", "ojo"], ["torso", "escalera"], ["hand", "mano"]],
  guardian: [["head", "mascara"], ["torso", "escalera"], ["hand", "mano"]],
};

const compiles = (p: CreatureProgram): boolean => {
  try {
    compileProgram(p, MORPH_POLICY);
    return true;
  } catch {
    return false;
  }
};

function base(family: BodyFamily, recipe: Array<[string, string]>): CreatureProgram {
  const operations: CreatureOp[] = [];
  for (const [socket, motif] of recipe) {
    const op: CreatureOp = { op: "replace", socket, motif };
    if (compiles({ family, seed: 1, operations: [...operations, op] })) operations.push(op);
  }
  return { family, seed: 1, operations };
}

describe("every member of every family is one connected silhouette", () => {
  it("50 member seeds × B1–B5 × four recipes: the laid-out pieces form ONE component", () => {
    const loose: string[] = [];
    for (const family of BODY_FAMILIES) {
      for (const [name, recipe] of Object.entries(RECIPES)) {
        const b = base(family, recipe);
        for (let i = 0; i < 50; i++) {
          const m = memberProgram(b, fnv1a(`conexo:${family}:${name}:${i}`), MEMBER_VARIATION, compiles);
          const n = silhouetteComponents(compileProgram(m.program, MORPH_POLICY).graph);
          if (n !== 1) loose.push(`${family}/${name}/${i} (${m.notes.join(", ")}): ${n}`);
        }
      }
    }
    expect(loose).toEqual([]);
  }, 60_000);
});
