import { mkdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const resolveExtensionless = `export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith(".") && !/\\.[a-z]+$/.test(spec)) return next(spec + ".ts", ctx);
    throw e;
  }
}`;
register(`data:text/javascript,${encodeURIComponent(resolveExtensionless)}`);

const { direct } = await import("../../web/src/atelier/director.ts");
const { composeWork } = await import("../../web/src/atelier/work.ts");
const { workComplexity, workGraph } = await import("../../web/src/atelier/manifest.ts");
const { ACCEPTANCE, clusterShapes, compositionSilhouette, effectiveDiversity, evaluate, isEligible, occlusionBattery, silhouetteUnits, topologicalDiversity } = await import("../../web/src/graphics/application/complexity/index.ts");
const { COMPLEXITY_TUNING } = await import("../../web/src/graphics/config/complexity.ts");

const here = dirname(fileURLToPath(import.meta.url));
const WIDTH = 1200;
const HEIGHT = 900;
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const NARRATIONS = [
  "ocho robots hechos de cráneos y ojos que suben escaleras infinitas en las manos del poder",
  "una procesión de monjes con cabeza de máscara rodea a un jaguar gigante en un patio pequeño de noche",
  "una ciudad de torres conectadas por puentes donde vigilan cien ojos",
  "un palacio de salones con habitaciones secretas donde vigila un ojo",
  "un templo de patios sucesivos con un jaguar en el centro",
  "un laberinto de pasillos donde se pierden cinco calacas",
  "un templo en terrazas escalonadas: una pirámide con escalinatas que suben a la cima",
  "una ciudad de calles y avenidas que se cruzan en esquinas y encrucijadas",
];

const works = NARRATIONS.flatMap((narration) => SEEDS.map((seed) => {
  const recipe = direct(narration, seed);
  const work = composeWork(recipe, WIDTH, HEIGHT);
  const list = work.stages.flatMap((s) => s.shapes);
  const units = silhouetteUnits(list, WIDTH, HEIGHT, COMPLEXITY_TUNING).filter((u) => u.kind === "building" && isEligible(u, COMPLEXITY_TUNING));
  const composite = compositionSilhouette(list, WIDTH, HEIGHT, "building", COMPLEXITY_TUNING);
  return { narration, seed, composition: work.plan.composition, archetype: work.program?.archetype ?? null, graph: workGraph(work), report: workComplexity(work), units, composite };
}));

const graphs = works.flatMap((w) => (w.graph ? [w.graph] : []));
const topologies = topologicalDiversity(graphs);
const battery = occlusionBattery();
const occlusionViolations = battery.reduce((n, r) => n + r.violations, 0);
const verdicts = works.map((w) => evaluate(w.report, { topologies, occlusionViolations }));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const table = verdicts[0].map((row, i) => {
  const values = verdicts.map((v) => v[i].valor).filter((x): x is number => x !== null);
  const passing = verdicts.filter((v) => v[i].pasa === true).length;
  return {
    criterio: row.criterio,
    umbral: row.umbral,
    min: values.length ? Math.min(...values) : null,
    mediana: values.length ? median(values) : null,
    max: values.length ? Math.max(...values) : null,
    obrasQuePasan: !values.length ? "sin dato" : verdicts.every((v) => v[i].pasa === null) ? "sin umbral" : `${passing}/${works.length}`,
  };
});

type Run = (typeof works)[number];
const visualOf = (own: Run[]) => {
  const composites = own.flatMap((w) => (w.composite ? [w.composite] : []));
  const labels = clusterShapes(composites, COMPLEXITY_TUNING);
  const pooled = clusterShapes(own.flatMap((w) => w.units.map((u) => u.descriptor)), COMPLEXITY_TUNING);
  return { composiciones: new Set(labels).size, dEffComposiciones: Number(effectiveDiversity(labels).toFixed(2)), siluetasEdificioConjunto: new Set(pooled).size };
};
const graphsOf = (own: Run[]) => own.flatMap((w) => (w.graph ? [w.graph] : []));
const keyOf = (w: Run) => w.archetype ?? w.composition;
const spread = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? `${Math.min(...v).toFixed(2)}/${median(v).toFixed(2)}/${Math.max(...v).toFixed(2)}` : "sin dato";
};
const summary = (own: Run[]) => {
  const b = own.map((w) => w.report.silhouettes.buildings);
  const c = own.map((w) => w.report.coverage);
  const r = own.map((w) => w.report.rewrites);
  return {
    obras: own.length, topologías: topologicalDiversity(graphsOf(own)), ...visualOf(own),
    clústeresMax: Math.max(...b.map((x) => x.distinctClusters)), dEffMax: Number(Math.max(...b.map((x) => x.effectiveDiversity)).toFixed(2)),
    siteFillEdif: spread(c.map((x) => x.buildings.siteFill)), hullEff: spread(c.map((x) => x.buildings.hullEfficiency)), siteFillCriat: spread(c.map((x) => x.creatures.siteFill)), regionFillCriat: spread(c.map((x) => x.creatures.regionFill)),
    criaturasDEffMax: Number(Math.max(...own.map((w) => w.report.silhouettes.creatures.effectiveDiversity)).toFixed(2)),
    profVerifMax: Math.max(...r.map((x) => x.maxVerifiedDepth)), obrasConCadena3: own.filter((w) => w.report.rewrites.visibleChainsDepth3 > 0).length,
  };
};
const byArchetype = Object.fromEntries([...new Set(works.map(keyOf))].map((k) => [k, summary(works.filter((w) => keyOf(w) === k))]));
const byNarration = Object.fromEntries(NARRATIONS.map((n) => [n.slice(0, 40), summary(works.filter((w) => w.narration === n))]));
const diversity = { topológica: topologies, visual: visualOf(works) };
const bandMeans = [0, 1, 2, 3].map((b) => Number((works.reduce((s, w) => s + w.report.multiscale.bands[b].areaPct, 0) / works.length).toFixed(1)));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "complexity-baseline.json"), JSON.stringify({ lienzo: { width: WIDTH, height: HEIGHT }, seeds: SEEDS, narrations: NARRATIONS, acceptance: ACCEPTANCE, diversity, occlusionBattery: battery, byArchetype, byNarration, bandMeansPct: bandMeans, table, works: works.map(({ graph: _g, units: _u, composite: _c, ...w }) => w) }, null, 2));
console.table(table);
console.table(byArchetype);
console.table(byNarration);
console.table(battery);
console.log(`diversidad TOPOLÓGICA: ${topologies} grafos distintos; diversidad VISUAL: ${diversity.visual.composiciones} siluetas de composición distintas (D_eff ${diversity.visual.dEffComposiciones}), ${diversity.visual.siluetasEdificioConjunto} clústeres de silueta de edificio en todo el conjunto`);
console.log(`área media por banda (%): ${bandMeans.join(" / ")}; composiciones: ${[...new Set(works.map((w) => w.composition))].join(", ")}; grafos: ${graphs.length}`);
