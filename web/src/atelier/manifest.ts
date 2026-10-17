import type { Illustration } from "../graphics/application/compose.ts";
import { toSvg } from "../graphics/renderers/svg/serialize.ts";
import { fnv1a } from "../shared/rng";
import type { Recipe } from "./director.ts";
import { describeShape, flattenStrokes, stageBounds } from "./strokes.ts";

export type Manifest = {
  obra: string;
  receta: Recipe;
  procedencia: { inspiración: string; decisiones: string[]; matemáticas: string; motor: string; referenciaExterna: string };
  etapas: { nombre: string; trazos: number }[];
  trazos: number;
  hashSvg: string;
};

export function svgOf(ill: Illustration): string {
  return toSvg(ill.layers, ill.width, ill.height);
}

export function buildManifest(recipe: Recipe, ill: Illustration): Manifest {
  const stages = stageBounds(ill.stages);
  return {
    obra: recipe.title,
    receta: recipe,
    procedencia: {
      inspiración: recipe.narration,
      decisiones: recipe.choices.map((c) => `${c.decision.field} = ${String(c.decision.value)} — ${c.because} [${c.source}]`),
      matemáticas: "gramática arquitectónica en metros → proyección de un punto de fuga → motivos (greca, chevrón, hélice, roseta, volutas, Sierpinski, dovelas)",
      motor: "web/src/graphics (dominio → config → pintores de fachada → Canvas 2D / SVG), semilla mulberry32",
      referenciaExterna: recipe.reference,
    },
    etapas: stages.map((s) => ({ nombre: s.name, trazos: s.to - s.from })),
    trazos: stages.length > 0 ? stages[stages.length - 1].to : 0,
    hashSvg: fnv1a(svgOf(ill)).toString(16).padStart(8, "0"),
  };
}

export function strokeLog(ill: Illustration): string {
  return flattenStrokes(ill.stages)
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
