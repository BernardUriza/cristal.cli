import type { Provenance } from "../graphics/application/compose.ts";
import type { Work } from "./work.ts";
import { toSvg } from "../graphics/renderers/svg/serialize.ts";
import { fnv1a } from "../shared/rng";
import type { Recipe } from "./director.ts";
import { describeShape, flattenStrokes, stageBounds } from "./strokes.ts";

export type Manifest = {
  obra: string;
  receta: Recipe;
  procedencia: { inspiración: string; decisiones: string[]; matemáticas: string; motor: string; referenciaExterna: string };
  etapas: { nombre: string; trazos: number; procedencia: Provenance | null }[];
  trazos: number;
  hashSvg: string;
};

export function svgOf(work: Work): string {
  return toSvg(work.stages.flatMap((s) => s.shapes), work.width, work.height);
}

export function buildManifest(recipe: Recipe, work: Work): Manifest {
  const stages = stageBounds(work.stages);
  return {
    obra: recipe.title,
    receta: recipe,
    procedencia: {
      inspiración: recipe.narration,
      decisiones: recipe.choices.map((c) => `${c.decision.field} = ${String(c.decision.value)} — ${c.because} [${c.source}]`),
      matemáticas: "composición → gramática arquitectónica en metros (planta, volúmenes, proyección) → ornamento por superficie (greca, chevrón, estrías, rosetas, Sierpinski) → anomalía surrealista → motivos Bézier propios",
      motor: "web/src/graphics (dominio → config → pintores → Canvas 2D / SVG), semilla mulberry32; cada etapa lleva su algoritmo y parámetros",
      referenciaExterna: recipe.reference,
    },
    etapas: work.stages.map((s, i) => ({ nombre: s.name, trazos: stages[i].to - stages[i].from, procedencia: s.provenance ?? null })),
    trazos: stages.length > 0 ? stages[stages.length - 1].to : 0,
    hashSvg: fnv1a(svgOf(work)).toString(16).padStart(8, "0"),
  };
}

export function strokeLog(work: Work): string {
  return flattenStrokes(work.stages)
    .map((s) => `${String(s.index).padStart(5, "0")} ${s.stage.padEnd(10)} ${describeShape(s.shape)}`)
    .join("\n");
}

export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
