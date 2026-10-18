import type { Rewrite } from "../domain/rewrite/rewrite.ts";

export type RuleId = "T1_COLUMN_AS_BODY" | "T2_BODY_AS_FACADE" | "T3_OPENING_AS_PORTAL" | "T4_INHABITED_FRIEZE" | ArchRuleId;

export type ArchRuleId = "T5_BUILDING_AS_ORNAMENT" | "T6_ARCHITECTURE_AS_ARCHITECTURE" | "T7_ORNAMENT_AS_SPACE";

export const ARCH_RULES = ["T5", "T6", "T7"] as const;

export type ArchRule = (typeof ARCH_RULES)[number];

export const ARCH_RULE_ID: Record<ArchRule, ArchRuleId> = { T5: "T5_BUILDING_AS_ORNAMENT", T6: "T6_ARCHITECTURE_AS_ARCHITECTURE", T7: "T7_ORNAMENT_AS_SPACE" };

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
  T5_BUILDING_AS_ORNAMENT: {
    id: "T5_BUILDING_AS_ORNAMENT",
    match: { geometryId: "panel" },
    replaceWith: "mini-edificio",
    constraints: { preserveBounds: true, preserveAnchors: true, maxDepth: 3, minProjectedPx: 28 },
    semantic: { from: "ornamento", to: "edificio" },
  },
  T6_ARCHITECTURE_AS_ARCHITECTURE: {
    id: "T6_ARCHITECTURE_AS_ARCHITECTURE",
    match: [{ geometryId: "capitel" }, { geometryId: "fronton" }, { geometryId: "cubierta" }],
    replaceWith: "mini-templo",
    constraints: { preserveBounds: false, preserveAnchors: true, maxDepth: 3, minProjectedPx: 10 },
    semantic: { from: "pieza-estructural", to: "templo" },
  },
  T7_ORNAMENT_AS_SPACE: {
    id: "T7_ORNAMENT_AS_SPACE",
    match: [{ geometryId: "celda-friso" }, { geometryId: "ventana" }, { geometryId: "loseta" }],
    replaceWith: "escena-portal",
    constraints: { preserveBounds: true, preserveAnchors: true, maxDepth: 3, minProjectedPx: 12 },
    semantic: { from: "patron-plano", to: "espacio" },
  },
};

export const REWRITE_TUNING = { miniPatioPx: 90, friezePeriod: [3, 5], friezeHeightM: 1.1, facadeCellPx: 17, towerCellRatio: 0.55, declaredMinPx: 10, corridorFrames: 4, trunk: { samples: 5, margin: 0.08, minShare: 0.15 } } as const;

export const ARCH_REWRITE_TUNING = { hostMinPx: 70, frontonShare: 0.16, panelAspect: 1, templeRise: 2.4, base: 0.15, density: 0.45, anomaly: 0.4 } as const;
