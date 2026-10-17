import { pick } from "../../../../../shared/rng.ts";
import { socketsOf } from "./kinds.ts";
import { between, joined, partOf, within } from "./build.ts";
import type { BodyContext, BodyExpansion, BodyFamily, BodyProduction, PartNode } from "./types.ts";

const ROOT: BodyProduction["accepts"] = ["enclosure"];

export const BIPED: BodyProduction = {
  id: "B1-bipedo",
  accepts: ROOT,
  weight: 1,
  maxDepth: 1,
  expand(t, ctx): BodyExpansion {
    const head = partOf(ctx, "head", "crown", within(ctx, 0.48, 0.72), t);
    const arm = partOf(ctx, "limb", "span", within(ctx, 0.65, 0.95), t);
    const leg = partOf(ctx, "limb", "support", within(ctx, 0.8, 1.15), t);
    return {
      nodes: [head, arm, leg],
      edges: [
        joined(t, "bottom", leg, "top", { offset: [within(ctx, 0.1, 0.2), -0.06], angle: within(ctx, -14, 0), mirror: true, behind: true }),
        joined(t, "right", arm, "top", { offset: [-0.06, within(ctx, -0.22, 0)], angle: within(ctx, 20, 80), mirror: true, behind: true }),
        joined(t, "top", head, "bottom", { offset: [0, 0.08] }),
      ],
    };
  },
};

export const QUADRUPED: BodyProduction = {
  id: "B2-cuadrupedo",
  accepts: ROOT,
  weight: 1,
  maxDepth: 1,
  expand(t, ctx): BodyExpansion {
    const head = partOf(ctx, "head", "crown", within(ctx, 0.45, 0.65), t);
    const leg = partOf(ctx, "limb", "support", within(ctx, 0.45, 0.85), t);
    const tail = partOf(ctx, "tail", "connector", within(ctx, 0.3, 0.5), t);
    return {
      nodes: [leg, tail, head],
      edges: [
        joined(t, "bottom", leg, "top", { offset: [within(ctx, 0.26, 0.36), -0.08], mirror: true, behind: true }),
        joined(t, "right", tail, "top", { offset: [-0.06, -0.08], angle: within(ctx, -70, 10), behind: true, recursion: { times: between(ctx, 2, 5), scale: 0.82, turn: within(ctx, -30, 15) } }),
        joined(t, "left", head, "right", { offset: [0.1, within(ctx, -0.3, -0.05)] }),
      ],
    };
  },
};

export const SERPENTINE: BodyProduction = {
  id: "B3-serpentino",
  accepts: ROOT,
  weight: 1,
  maxDepth: 1,
  expand(t, ctx): BodyExpansion {
    const head = partOf(ctx, "head", "crown", 1.25, t);
    const segment = partOf(ctx, "tail", "connector", 0.92, t);
    const tip = partOf(ctx, "foot", "connector", 0.8, segment);
    const recursion = { times: between(ctx, 6, 9), scale: 0.92, turn: within(ctx, 18, 32), wave: between(ctx, 2, 4), via: "right" };
    return {
      nodes: [segment, tip, head],
      edges: [joined(t, "right", segment, "left", { offset: [-0.28, 0], behind: true, recursion }), joined(segment, "right", tip, "top", { offset: [-0.1, 0] }), joined(t, "left", head, "right", { offset: [0.18, 0] })],
    };
  },
};

export const RADIAL: BodyProduction = {
  id: "B4-radial",
  accepts: ROOT,
  weight: 1,
  maxDepth: 1,
  expand(t, ctx): BodyExpansion {
    const n = between(ctx, 5, 8);
    const times = between(ctx, 2, 3);
    const arms = Array.from({ length: n }, () => partOf(ctx, "limb", "span", 0.72, t));
    return { nodes: arms, edges: arms.map((arm, i) => joined(t, "center", arm, "top", { angle: (360 * i) / n, behind: true, recursion: { times, scale: 0.8, turn: 0 } })) };
  },
};

function graft(t: PartNode, taken: readonly string[], ctx: BodyContext): BodyExpansion {
  const free = socketsOf(t.kind).filter((s) => s.name !== "center" && taken.indexOf(s.name) < 0 && s.accepts.indexOf("span") >= 0);
  if (free.length === 0) return { nodes: [], edges: [] };
  const socket = pick(ctx.rng, free);
  const limb = partOf(ctx, "limb", "span", 0.7, t);
  const sided = socket.name === "left" || socket.name === "right";
  return { nodes: [limb], edges: [joined(t, socket.name, limb, "top", { mirror: sided, behind: true })] };
}

export const CHIMERA: BodyProduction = {
  id: "B5-quimera",
  accepts: ROOT,
  weight: 1,
  maxDepth: 1,
  expand(t, ctx): BodyExpansion {
    const base = pick(ctx.rng, [BIPED, QUADRUPED]).expand(t, ctx);
    const extra = graft(t, base.edges.filter((e) => e.from === t.id).map((e) => e.socket), ctx);
    return { nodes: [...base.nodes, ...extra.nodes], edges: [...base.edges, ...extra.edges] };
  },
};

export const FAMILY_PRODUCTIONS: Record<BodyFamily, BodyProduction> = { biped: BIPED, quadruped: QUADRUPED, serpentine: SERPENTINE, radial: RADIAL, chimera: CHIMERA };
