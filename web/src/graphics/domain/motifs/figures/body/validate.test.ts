import { describe, expect, it } from "vitest";
import { BODY_TUNING } from "./tuning.ts";
import { instanceCount, validateBody } from "./validate.ts";
import { BodyGraphError, type BodyErrorCode, type PartEdge, type PartNode } from "./types.ts";

const torso: PartNode = { id: "t", kind: { motif: "mascara" }, role: "enclosure", scale: 1, depth: 0 };
const head: PartNode = { id: "h", kind: { motif: "craneo" }, role: "crown", scale: 0.6, depth: 1 };
const arm: PartNode = { id: "a", kind: { primitive: "capsule" }, role: "span", scale: 0.8, depth: 1 };
const neck: PartEdge = { from: "t", socket: "top", to: "h", joint: "bottom" };
const shoulder: PartEdge = { from: "t", socket: "right", to: "a", joint: "top", mirror: true };

function code(nodes: PartNode[], edges: PartEdge[], budget?: number): BodyErrorCode | "ok" {
  try {
    validateBody({ root: "t", nodes, edges }, budget);
    return "ok";
  } catch (err) {
    if (err instanceof BodyGraphError) return err.code;
    throw err;
  }
}

describe("validateBody", () => {
  it("accepts a well formed torso with head and mirrored arm", () => {
    expect(code([torso, head, arm], [neck, shoulder])).toBe("ok");
  });

  it("catches a socket the parent does not have and a joint the child does not have", () => {
    expect(code([torso, head], [{ ...neck, socket: "hombro" }])).toBe("unknown-socket");
    expect(code([torso, head], [{ ...neck, joint: "rodilla" }])).toBe("unknown-socket");
    expect(code([torso, arm], [{ ...shoulder, recursion: { times: 2, scale: 0.8, turn: 0, via: "codo" } }])).toBe("unknown-socket");
  });

  it("catches a role the socket refuses: a head hanging from the bottom", () => {
    expect(code([torso, head], [{ ...neck, socket: "bottom" }])).toBe("incompatible-role");
  });

  it("catches a budget overflow counted in drawn pieces, mirrors and recursion included", () => {
    const tail: PartEdge = { ...shoulder, recursion: { times: 5, scale: 0.8, turn: 10 } };
    expect(instanceCount({ root: "t", nodes: [torso, arm], edges: [tail] })).toBe(11);
    expect(code([torso, arm], [tail], 10)).toBe("budget-exceeded");
    expect(code([torso, arm], [tail], 11)).toBe("ok");
  });

  it("catches cycles, shared children and orphans", () => {
    const loop: PartEdge = { from: "h", socket: "center", to: "t", joint: "bottom" };
    expect(code([torso, head], [neck, loop])).toBe("cycle");
    expect(code([torso, head, arm], [neck, { from: "a", socket: "top", to: "h", joint: "bottom" }, shoulder])).toBe("shared-child");
    expect(code([torso, head, arm], [neck])).toBe("orphan");
  });

  it("catches unknown motifs, dangling edges, depth and recursion bounds", () => {
    expect(code([torso, { ...head, kind: { motif: "dragon" } }], [neck])).toBe("unknown-kind");
    expect(code([torso], [neck])).toBe("unknown-node");
    expect(code([torso, { ...head, depth: BODY_TUNING.maxDepth + 1 }], [neck])).toBe("depth-exceeded");
    expect(code([torso, arm], [{ ...shoulder, recursion: { times: BODY_TUNING.maxRecursion + 1, scale: 0.8, turn: 0 } }])).toBe("bad-recursion");
    expect(code([torso, arm], [{ ...shoulder, recursion: { times: 2, scale: 1.5, turn: 0 } }])).toBe("bad-recursion");
  });
});
