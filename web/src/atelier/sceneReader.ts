import { DEFAULT_ARCHITECTURE, SCENE_LIMITS, type ArchitectureSpec, type Creature, type Group, type Scene } from "../graphics/config/scene.ts";
import { ARCHITECTURE_RULES, ARRANGEMENT_RULES, CREATURE_TEMPLATES, MATERIAL_WORDS, NUMBER_WORDS, PLACE_RULES } from "./sceneRules.ts";
import type { MotifName } from "./vocabulary.ts";

const OBJECT_NAMES = ["ojo", "mano", "cráneo", "máscara"];
const OBJECT_SCALE = 2.2;

export type SceneReading = { scene: Scene; because: string[] };

function countBefore(text: string, index: number): number | null {
  const before = text.slice(Math.max(0, index - 24), index).toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = before.length - 1; i >= Math.max(0, before.length - 3); i--) {
    const w = before[i].replace(/[^\p{L}\d]/gu, "");
    if (/^\d+$/.test(w)) return Math.min(SCENE_LIMITS.count, Number(w));
    if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
  }
  return null;
}

function materials(text: string, after: number): Creature["parts"] {
  const tail = text.slice(after, after + 80);
  const made = /hech[oa]s? de|de pur[oa]s?|con cabeza de|compuest[oa]s? de|cuerpo de/i.exec(tail);
  if (!made) return {};
  const parts: Creature["parts"] = {};
  const zone = tail.slice(made.index, made.index + 60);
  for (const m of MATERIAL_WORDS) if (m.match.test(zone) && !parts[m.part]) parts[m.part] = m.motif;
  return parts;
}

export function readScene(narration: string, wallMotifs: MotifName[] = []): SceneReading {
  const because: string[] = [];
  const groups: Group[] = [];
  const taken = new Set<string>();
  for (const t of CREATURE_TEMPLATES) {
    if (groups.length === SCENE_LIMITS.groups) break;
    const m = t.match.exec(narration);
    if (!m || taken.has(t.name)) continue;
    if (Object.keys(t.parts).length === 1 && groups.some((g) => Object.values(g.creature.parts).includes(Object.values(t.parts)[0]!))) continue;
    taken.add(t.name);
    const custom = materials(narration, m.index + m[0].length);
    const parts = Object.keys(custom).length ? { ...custom, ...(custom.cuerpo ? {} : { cuerpo: t.parts.cuerpo ?? "escalera" }) } : t.parts;
    const isObject = OBJECT_NAMES.includes(t.name) && Object.keys(custom).length === 0;
    const count = countBefore(narration, m.index) ?? (isObject ? 1 : /s\b/i.test(m[0]) ? 3 : 1);
    const lead = groups.length === 0;
    const arr = lead && !isObject ? ARRANGEMENT_RULES.find((r) => r.match.test(narration)) : undefined;
    const place = lead ? PLACE_RULES.find((r) => r.match.test(narration)) : undefined;
    groups.push({ creature: { name: t.name, parts }, count, arrangement: arr?.arrangement ?? (count > 4 ? "procesion" : "fila"), place: arr?.place ?? place?.place ?? "patio", scale: isObject ? OBJECT_SCALE : 1 });
    because.push(`${count} ${t.name} (encontré «${m[0]}»${Object.keys(custom).length ? `, hechos de ${Object.values(custom).join(" y ")}` : ""})${arr ? `; ${arr.because}` : ""}${place && !arr?.place ? `; ${place.because}` : ""}`);
  }
  for (const motif of wallMotifs) {
    if (groups.length === SCENE_LIMITS.groups || groups.some((g) => Object.values(g.creature.parts).includes(motif))) continue;
    groups.push({ creature: { name: motif, parts: { cuerpo: motif } }, count: 1, arrangement: "fila", place: "patio", scale: 1.4 });
    because.push(`${motif} de la pared, al centro del patio`);
  }
  const architecture: ArchitectureSpec = { ...DEFAULT_ARCHITECTURE };
  for (const r of ARCHITECTURE_RULES) {
    if (!r.match.test(narration) || architecture[r.field] !== DEFAULT_ARCHITECTURE[r.field]) continue;
    (architecture as Record<string, string>)[r.field] = r.value;
    because.push(r.because);
  }
  return { scene: { groups, architecture }, because };
}
