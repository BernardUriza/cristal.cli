import type { Stroke } from "./strokes.ts";
import { describeShape, describeStyle } from "./strokes.ts";

function paramsLine(params: Record<string, number | string>): string {
  return Object.entries(params).map(([k, v]) => `${k}=${typeof v === "number" ? Math.round(v * 100) / 100 : v}`).join(", ");
}

export function Inspector({ stroke, total }: { stroke: Stroke | null; total: number }) {
  if (!stroke) return <p className="atelier-hint">toca un trazo del dibujo para ver de dónde salió</p>;
  return (
    <dl className="atelier-inspector">
      <dt>trazo</dt>
      <dd>{stroke.index + 1} de {total}</dd>
      <dt>etapa</dt>
      <dd>{stroke.stage}</dd>
      <dt>geometría</dt>
      <dd>{describeShape(stroke.shape)}</dd>
      <dt>estilo</dt>
      <dd>{describeStyle(stroke.shape)}</dd>
      <dt>algoritmo</dt>
      <dd>{stroke.provenance?.algorithm ?? "pintor de fachada sobre la gramática en metros"}</dd>
      <dt>parámetros</dt>
      <dd>{stroke.provenance ? paramsLine(stroke.provenance.params) : "los de la etapa"}</dd>
      <dt>decisión</dt>
      <dd>{stroke.provenance?.decision ?? `pintor «${stroke.stage}»`}</dd>
      <dt>referencia externa</dt>
      <dd>ninguna imagen externa utilizada</dd>
    </dl>
  );
}
