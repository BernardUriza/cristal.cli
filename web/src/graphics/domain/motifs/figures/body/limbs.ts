import { joined, partOf } from "./build.ts";
import type { BodyExpansion, BodyProduction, PartNode } from "./types.ts";

const isCapsule = (n: PartNode): boolean => "primitive" in n.kind && n.kind.primitive === "capsule";

export const HAND: BodyProduction = {
  id: "L1-mano",
  accepts: ["span"],
  weight: 3,
  maxDepth: 4,
  when: isCapsule,
  expand(t, ctx): BodyExpansion {
    const hand = partOf(ctx, "hand", "span", 0.75, t);
    return { nodes: [hand], edges: [joined(t, "bottom", hand, "bottom", { offset: [0, -0.04] })] };
  },
};

export const FOOT: BodyProduction = {
  id: "L2-pie",
  accepts: ["support"],
  weight: 3,
  maxDepth: 4,
  when: isCapsule,
  expand(t, ctx): BodyExpansion {
    const foot = partOf(ctx, "foot", "support", 0.55, t);
    return { nodes: [foot], edges: [joined(t, "bottom", foot, "top", { offset: [0, -0.06] })] };
  },
};

export const EYES: BodyProduction = {
  id: "L3-mirada",
  accepts: ["crown"],
  weight: 2,
  maxDepth: 4,
  expand(t, ctx): BodyExpansion {
    const eye = partOf(ctx, "eye", "opening", 0.24, t);
    return { nodes: [eye], edges: [joined(t, "center", eye, "center", { offset: [0.17, -0.06], mirror: true })] };
  },
};

export const HORNS: BodyProduction = {
  id: "L4-cuernos",
  accepts: ["crown"],
  weight: 1,
  maxDepth: 4,
  expand(t, ctx): BodyExpansion {
    const horn = partOf(ctx, "foot", "connector", 0.38, t, { primitive: "spike" });
    return { nodes: [horn], edges: [joined(t, "top", horn, "top", { offset: [0.2, 0.06], angle: 25, mirror: true, behind: true })] };
  },
};

export const LIMB_PRODUCTIONS: readonly BodyProduction[] = [HAND, FOOT, EYES, HORNS];
