import type { Rng } from "../../../../shared/rng";
import type { Vec2 } from "../../shapes.ts";
import type { FlowTexture } from "./character.ts";
import type { Figure } from "./define.ts";
import { flowField } from "./flowField.ts";
import type { Ornament } from "./ornamentador.ts";

export function flowTexture(fig: Figure, region: readonly Vec2[], rng: Rng, t: FlowTexture, ink: string, avoid?: (p: Vec2) => boolean): Ornament {
  const style = { fill: "none", stroke: ink, strokeWidth: fig.inkWidth * t.width, opacity: t.opacity };
  return flowField(region, rng, { spacing: fig.px(t.spacing), stepLen: fig.px(t.step), style, avoid }, t.flow);
}
