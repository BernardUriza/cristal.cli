import { DEFAULT_ARCHITECTURE, SCENE_LIMITS, type ArchitectureSpec, type Creature, type Group, type Scene } from "../graphics/config/scene.ts";
import { ARCHITECTURE_RULES, ARRANGEMENT_RULES, COURTYARD_NOUNS, CREATURE_TEMPLATES, MATERIAL_STOP, MATERIAL_WORDS, PLACE_RULES, WALL_RULE } from "./sceneRules.ts";
import { countBefore, isFigureWord, maskSizeWords, placeSizeAfter, sizeAfter } from "./sceneWords.ts";
import { fnv1a } from "../shared/rng.ts";
import type { MotifName } from "./vocabulary.ts";
import { familyProgram, maskOpWords, programWords } from "./creatureProgramReader.ts";
import { morphWords, usesMotif } from "./morphReader.ts";
import { bodyProgram, chooseFamily, familyClues, sayFamily } from "./familyReader.ts";
import type { BodyFamily } from "../graphics/domain/motifs/figures/body/types.ts";

const OBJECT_NAMES = ["ojo", "mano", "cráneo", "máscara"];
const OBJECT_SCALE = 2.2;

export type SceneReading = { scene: Scene; because: string[] };

type Made = { parts: Creature["parts"]; zone: readonly [number, number] | null };

function materials(text: string, after: number): Made {
  const tail = text.slice(after, after + 80);
  const made = /hech[oa]s? de|de pur[oa]s?|con cabeza de|compuest[oa]s? de|cuerpo de/i.exec(tail);
  if (!made) return { parts: {}, zone: null };
  const parts: Creature["parts"] = {};
  const rest = tail.slice(made.index + made[0].length);
  const stop = MATERIAL_STOP.exec(rest);
  const zone = made[0] + rest.slice(0, Math.min(60 - made[0].length, stop ? stop.index : Infinity));
  for (const m of MATERIAL_WORDS) if (m.match.test(zone) && !parts[m.part]) parts[m.part] = m.motif;
  const from = after + made.index;
  return { parts, zone: [from, from + zone.length] };
}

/** The first time a figure is named on its own: a word that is another group's material does not count. */
function namedOutside(re: RegExp, text: string, zones: ReadonlyArray<readonly [number, number]>): RegExpExecArray | null {
  const g = new RegExp(re.source, re.flags.indexOf("g") >= 0 ? re.flags : `${re.flags}g`);
  for (let m = g.exec(text); m; m = g.exec(text)) if (!zones.some(([a, b]) => m!.index >= a && m!.index < b)) return m;
  return null;
}

export function readScene(spoken: string, wallMotifs: MotifName[] = [], seed: number = fnv1a(spoken)): SceneReading {
  const narration = maskSizeWords(maskOpWords(spoken), isFigureWord);
  const because: string[] = [];
  const groups: Group[] = [];
  const at: number[] = [];
  const taken = new Set<string>();
  const used = new Set<BodyFamily>();
  const defaulted = new Set<number>();
  const zones: Array<readonly [number, number]> = [];
  for (const t of CREATURE_TEMPLATES) {
    if (groups.length === SCENE_LIMITS.groups) break;
    const m = namedOutside(t.match, narration, zones);
    if (!m || taken.has(t.name)) continue;
    taken.add(t.name);
    const made = materials(narration, m.index + m[0].length);
    const custom = made.parts;
    if (made.zone) zones.push(made.zone);
    const parts = Object.keys(custom).length ? { ...custom, ...(custom.cuerpo ? {} : { cuerpo: t.parts.cuerpo ?? "escalera" }) } : t.parts;
    const isObject = OBJECT_NAMES.includes(t.name) && Object.keys(custom).length === 0;
    const counted = countBefore(narration, m.index, seed, t.name);
    const count = counted?.count ?? (isObject ? 1 : /s\b/i.test(m[0]) ? 3 : 1);
    const size = sizeAfter(spoken, m.index + m[0].length);
    const lead = groups.length === 0;
    const arr = lead && !isObject ? ARRANGEMENT_RULES.find((r) => r.match.test(narration)) : undefined;
    const place = lead ? PLACE_RULES.find((r) => r.match.test(narration)) : undefined;
    at.push(m.index);
    const loneObject = isObject && count === 1;
    const choice = t.family || loneObject ? null : chooseFamily(familyClues(m[0], new Set(Object.values(custom)).size, narration, isObject), used);
    const program = t.family ? familyProgram(t.family, spoken, custom.cabeza ?? t.parts.cabeza) : choice ? bodyProgram(choice.family, spoken, t.name, parts) ?? undefined : undefined;
    if (program && program.family !== "seis-ranuras") used.add(program.family);
    if (choice && program) defaulted.add(groups.length);
    groups.push({ creature: { name: t.name, parts }, count, arrangement: arr?.arrangement ?? (count > 4 ? "procesion" : "fila"), place: arr?.place ?? place?.place ?? "patio", scale: Math.max(isObject ? OBJECT_SCALE : 1, size?.scale ?? 0), ...(program ? { program } : {}) });
    because.push(`${count} ${t.name} (encontré «${m[0]}»${counted?.because ? `; ${counted.because}` : ""}${size ? `; «${size.word}»: ${size.because}` : ""}${Object.keys(custom).length ? `, hechos de ${Object.values(custom).join(" y ")}` : ""})${arr ? `; ${arr.because}` : ""}${place && !arr?.place ? `; ${place.because}` : ""}${choice && program ? `; ${sayFamily(choice)}` : ""}`);
  }
  because.push(...programWords(spoken, groups, at, defaulted), ...morphWords(spoken, groups, at));
  const narrated = groups.length > 0 && WALL_RULE.onlyWithoutFigures;
  if (narrated && wallMotifs.some((motif) => !groups.some((g) => usesMotif(g, motif)))) because.push(WALL_RULE.because);
  for (const motif of narrated ? [] : wallMotifs) {
    if (groups.length === SCENE_LIMITS.groups || groups.some((g) => usesMotif(g, motif))) continue;
    groups.push({ creature: { name: motif, parts: { cuerpo: motif } }, count: 1, arrangement: "fila", place: "patio", scale: 1.4 });
    because.push(`${motif} de la pared, al centro del patio`);
  }
  const architecture: ArchitectureSpec = { ...DEFAULT_ARCHITECTURE };
  const sized = maskSizeWords(spoken, isFigureWord);
  const yard = placeSizeAfter(sized, COURTYARD_NOUNS);
  if (yard) {
    architecture.courtyard = yard.size;
    because.push(`«${yard.phrase}»: patio ${yard.size}`);
  }
  for (const r of ARCHITECTURE_RULES) {
    if (!r.match.test(sized) || architecture[r.field] !== DEFAULT_ARCHITECTURE[r.field]) continue;
    (architecture as Record<string, string>)[r.field] = r.value;
    because.push(r.because);
  }
  return { scene: { groups, architecture }, because };
}
