import type { Provenance, Stage } from "../graphics/application/compose.ts";
import type { Shape } from "../graphics/domain/shapes.ts";

export type Stroke = { index: number; stage: string; shape: Shape; provenance: Provenance | null };

export function flattenStrokes(stages: Stage[]): Stroke[] {
  const out: Stroke[] = [];
  for (const stage of stages) for (const shape of stage.shapes) out.push({ index: out.length, stage: stage.name, shape, provenance: stage.provenance ?? null });
  return out;
}

export function stageBounds(stages: Stage[]): { name: string; from: number; to: number }[] {
  let cursor = 0;
  return stages.map((stage) => {
    const from = cursor;
    cursor += stage.shapes.length;
    return { name: stage.name, from, to: cursor };
  });
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function describeShape(shape: Shape): string {
  switch (shape.kind) {
    case "polygon":
      return `polígono de ${shape.points.length} vértices`;
    case "polyline":
      return `polilínea de ${shape.points.length} puntos`;
    case "circle":
      return `círculo r=${round(shape.r)} en (${round(shape.cx)}, ${round(shape.cy)})`;
    case "ellipse":
      return `elipse ${round(shape.rx)}×${round(shape.ry)} en (${round(shape.cx)}, ${round(shape.cy)})`;
    case "line":
      return `línea (${round(shape.a[0])}, ${round(shape.a[1])}) → (${round(shape.b[0])}, ${round(shape.b[1])})`;
    case "rect":
      return `rectángulo ${round(shape.w)}×${round(shape.h)} en (${round(shape.x)}, ${round(shape.y)})`;
    case "path":
      return `trazo de ${shape.segments.length} segmentos (${shape.segments.filter((s) => s.op === "A").length} arcos)`;
    case "group":
      return `grupo de ${shape.children.length} formas`;
  }
}

export function describeStyle(shape: Shape): string {
  if (shape.kind === "group") return "hereda el estilo de sus hijas";
  const s = shape.style;
  const parts = [];
  if (s.fill && s.fill !== "none") parts.push(`relleno ${s.fill}`);
  if (s.stroke && s.stroke !== "none") parts.push(`tinta ${s.stroke} ×${s.strokeWidth ?? 1}`);
  if (s.opacity !== undefined && s.opacity < 1) parts.push(`opacidad ${s.opacity}`);
  if (s.glow) parts.push("brillo");
  return parts.join(", ") || "sin estilo";
}
