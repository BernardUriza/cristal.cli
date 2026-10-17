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
const { ACCEPTANCE, evaluate, topologicalDiversity } = await import("../../web/src/graphics/application/complexity/index.ts");

const here = dirname(fileURLToPath(import.meta.url));
const WIDTH = 1200;
const HEIGHT = 900;
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const NARRATIONS = [
  "ocho robots hechos de cráneos y ojos que suben escaleras infinitas en las manos del poder",
  "una procesión de monjes con cabeza de máscara rodea a un jaguar gigante en un patio pequeño de noche",
  "una ciudad de torres conectadas por puentes donde vigilan cien ojos",
];

const works = NARRATIONS.flatMap((narration) => SEEDS.map((seed) => {
  const recipe = direct(narration, seed);
  const work = composeWork(recipe, WIDTH, HEIGHT);
  return { narration, seed, composition: work.plan.composition, graph: workGraph(work), report: workComplexity(work) };
}));

const graphs = works.flatMap((w) => (w.graph ? [w.graph] : []));
const topologies = topologicalDiversity(graphs);
const verdicts = works.map((w) => evaluate(w.report, { topologies }));
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
    obrasQuePasan: values.length ? `${passing}/${works.length}` : "sin dato",
  };
});

const bandMeans = [0, 1, 2, 3].map((b) => Number((works.reduce((s, w) => s + w.report.multiscale.bands[b].areaPct, 0) / works.length).toFixed(1)));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "complexity-baseline.json"), JSON.stringify({ lienzo: { width: WIDTH, height: HEIGHT }, seeds: SEEDS, narrations: NARRATIONS, acceptance: ACCEPTANCE, topologies, bandMeansPct: bandMeans, table, works: works.map(({ graph: _g, ...w }) => w) }, null, 2));
console.table(table);
console.log(`área media por banda (%): ${bandMeans.join(" / ")}; composiciones: ${[...new Set(works.map((w) => w.composition))].join(", ")}; grafos: ${graphs.length}`);
