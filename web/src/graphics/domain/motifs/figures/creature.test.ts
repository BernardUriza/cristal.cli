import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../shared/rng";
import { drawCreature } from "./creature.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

describe("drawCreature", () => {
  it("composes a robot from skull head, eye pair and stair body, all inside its height", () => {
    const one = drawCreature({ cabeza: "craneo", ojos: "ojo", cuerpo: "escalera" }, 100, 300, 200, P, mulberry32(1));
    expect(one.provenance.params.partes).toBe("cuerpo=escalera, cabeza=craneo, ojos=ojo×2");
    expect(one.shapes.length).toBeGreaterThan(4);
    const two = drawCreature({ cabeza: "craneo" }, 100, 300, 200, P, mulberry32(1));
    expect(two.provenance.decision).toContain("una sola parte");
  });

  it("is deterministic and ignores unknown parts", () => {
    const a = drawCreature({ cabeza: "craneo", manos: "mano" }, 0, 0, 100, P, mulberry32(3));
    const b = drawCreature({ cabeza: "craneo", manos: "mano" }, 0, 0, 100, P, mulberry32(3));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(drawCreature({ cabeza: "dragon" }, 0, 0, 100, P, mulberry32(3)).shapes).toHaveLength(0);
  });
});
