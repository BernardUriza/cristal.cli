import type { Stroke } from "./strokes.ts";
import { describeShape, describeStyle } from "./strokes.ts";

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
      <dt>origen</dt>
      <dd>pintor de fachada «{stroke.stage}» sobre la gramática en metros, proyectado a píxeles</dd>
      <dt>referencia externa</dt>
      <dd>ninguna imagen externa utilizada</dd>
    </dl>
  );
}
