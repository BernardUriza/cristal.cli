import type { Rewrite } from "../domain/rewrite/rewrite.ts";

export type RuleId = "T1_COLUMN_AS_BODY" | "T2_BODY_AS_FACADE" | "T3_OPENING_AS_PORTAL" | "T4_INHABITED_FRIEZE";

export const REWRITES: Record<RuleId, Rewrite> = {
  T1_COLUMN_AS_BODY: {
    id: "T1_COLUMN_AS_BODY",
    match: { role: "support", geometryId: "pilar" },
    replaceWith: "cariatide",
    constraints: { preserveBounds: true, preserveAnchors: true, maxDepth: 1, minProjectedPx: 6 },
  },
  T2_BODY_AS_FACADE: {
    id: "T2_BODY_AS_FACADE",
    match: { role: "enclosure" },
    replaceWith: "fachada",
    constraints: { preserveBounds: true, preserveAnchors: true, maxDepth: 1, minProjectedPx: 24 },
  },
  T3_OPENING_AS_PORTAL: {
    id: "T3_OPENING_AS_PORTAL",
    match: { role: "opening" },
    replaceWith: "portal",
    constraints: { preserveBounds: true, preserveAnchors: true, maxDepth: 3, minProjectedPx: 9 },
  },
  T4_INHABITED_FRIEZE: {
    id: "T4_INHABITED_FRIEZE",
    match: { geometryId: "friso" },
    replaceWith: "friso-habitado",
    constraints: { preserveBounds: true, preserveAnchors: true, maxDepth: 1, minProjectedPx: 7 },
  },
};

export const REWRITE_TUNING = { miniPatioPx: 90, friezePeriod: [3, 5], friezeHeightM: 1.1, facadeCellPx: 17, towerCellRatio: 0.55, declaredMinPx: 10, corridorFrames: 4, trunk: { samples: 5, margin: 0.08, minShare: 0.15 } } as const;
