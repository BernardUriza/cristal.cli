import type { Decision } from "./directorRules.ts";

export function formatValue(decision: Decision): string {
  if (decision.field === "scene") {
    const s = decision.value;
    const groups = s.groups.map((g) => `${g.count} ${g.creature.name} [${Object.entries(g.creature.parts).map(([k, v]) => `${k}: ${v}`).join(", ")}] en ${g.arrangement}, ${g.place}`);
    return `${groups.join(" · ") || "sin figuras"} · edificio ${s.architecture.footprint}, patio ${s.architecture.courtyard}, alturas ${s.architecture.heights}`;
  }
  if (decision.field === "program") {
    const calls = decision.value.rules.map((r) => `${r.rule}@${r.target}${Object.keys(r.params).length ? `(${Object.entries(r.params).map(([k, x]) => `${k}=${x}`).join(",")})` : ""}`);
    return `${decision.value.archetype}: ${calls.join(" → ")}`;
  }
  const v = decision.value;
  if (Array.isArray(v)) return v.length ? v.join(", ") : "ninguno";
  return String(v);
}
