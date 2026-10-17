import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../../shared/rng.ts";
import { MOTIF_IDS } from "../index.ts";
import { expandBody } from "./expand.ts";
import { resolveBody } from "./resolve.ts";
import { instanceCount } from "./validate.ts";
import { BODY_FAMILIES, BodyGraphError } from "./types.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

describe("expandBody", () => {
  it("is deterministic per seed and differs across seeds", () => {
    for (const family of BODY_FAMILIES) {
      const a = expandBody({ seed: 5, family });
      expect(JSON.stringify(expandBody({ seed: 5, family }))).toBe(JSON.stringify(a));
      const draw = (seed: number) => JSON.stringify(resolveBody(expandBody({ seed, family }), 0, 0, 200, P, mulberry32(1)).shapes);
      expect(draw(5)).toBe(draw(5));
    }
    const seeds = Array.from({ length: 6 }, (_, i) => JSON.stringify(expandBody({ seed: i, family: "chimera" }).nodes.map((n) => n.kind)));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it("records the family production first and completes limbs with hands, feet, eyes or horns", () => {
    const g = expandBody({ seed: 3, family: "biped" });
    expect(g.applied[0]).toMatchObject({ rule: "B1-bipedo", origin: "program", target: g.root });
    expect(g.applied.slice(1).every((a) => a.origin === "completion" && /^L\d/.test(a.rule))).toBe(true);
  });

  it("respects the piece budget: a tight budget leaves limbs unfinished and says so", () => {
    for (const family of BODY_FAMILIES) {
      for (let seed = 0; seed < 8; seed++) {
        const free = expandBody({ seed, family });
        const own = [free.root, ...free.applied[0].added];
        const program = instanceCount({ root: free.root, nodes: free.nodes, edges: free.edges.filter((e) => own.indexOf(e.to) >= 0) });
        const tight = expandBody({ seed, family, budget: program + 1 });
        expect(instanceCount(tight)).toBeLessThanOrEqual(program + 1);
        if (instanceCount(free) > program + 1) expect(tight.fallbacks.join(" ")).toContain("presupuesto");
      }
    }
  });

  it("refuses a family production that does not fit and unknown families", () => {
    expect(() => expandBody({ seed: 1, family: "radial", budget: 3 })).toThrow(BodyGraphError);
    expect(() => expandBody({ seed: 1, family: "dragon" as never })).toThrow(/unknown-family/);
    expect(() => expandBody({ seed: -1, family: "biped" })).toThrow(/bad-param/);
  });

  it("uses the motifs the program names and chimeras draw from the motif pool", () => {
    const g = expandBody({ seed: 2, family: "biped", motifs: { head: "jaguar", torso: "escalera" } });
    expect(g.nodes.find((n) => n.id === g.root)!.kind).toEqual({ motif: "escalera" });
    expect(g.nodes.find((n) => n.role === "crown")!.kind).toEqual({ motif: "jaguar" });
    const torso = expandBody({ seed: 4, family: "chimera" }).nodes[0].kind;
    expect("motif" in torso && MOTIF_IDS.indexOf(torso.motif) >= 0).toBe(true);
  });
});
