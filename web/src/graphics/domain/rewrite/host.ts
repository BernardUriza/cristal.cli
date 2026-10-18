import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, polygon, stroked, type Shape, type Vec2 } from "../shapes.ts";
import { archedTop, localPart } from "./localPart.ts";
import type { Ink, Produced } from "./rewrite.ts";

export type HostSpec = { crown: "fronton" | "capitel"; crownShare: number; panelAspect: number; pick: (slot: number) => boolean };

const MARGIN = 0.06;

function diamonds(x0: number, y0: number, x1: number, y1: number, ink: Ink): Shape[] {
  const n = Math.max(2, Math.round((x1 - x0) / (y1 - y0)));
  const s = (x1 - x0) / n;
  const cy = (y0 + y1) / 2;
  return Array.from({ length: n }, (_, i) => polygon([[x0 + s * (i + 0.5), y0 + (y1 - y0) * 0.15], [x0 + s * (i + 0.9), cy], [x0 + s * (i + 0.5), y1 - (y1 - y0) * 0.15], [x0 + s * (i + 0.1), cy]], stroked(ink.ink, ink.line * 0.5)));
}

/** Level 0 of an architectural chain: a wall read as a crown band over a row of panels; `pick` says which may be rewritten, the rest stay ornament. */
export function facadeHost(w: number, h: number, spec: HostSpec, ink: Ink): Produced {
  const band = h * spec.crownShare;
  const crownBox: Vec2[] = quad(0, 0, w, band);
  const crown = localPart(spec.crown, "crown", spec.pick(0) ? spec.crown : `${spec.crown}-liso`, 0, 0, w, band, crownBox, { base: [w / 2, band] });
  const top = band + h * MARGIN;
  const bottom = h * (1 - MARGIN);
  const n = Math.max(1, Math.floor(w / ((bottom - top) * spec.panelAspect)));
  const pw = w / n;
  const children: Part[] = [crown];
  const childShapes: Shape[][] = [[polygon(crownBox, filled(ink.fill, ink.ink, ink.line * 0.7)), ...diamonds(0, band * 0.2, w, band * 0.8, ink)]];
  for (let i = 0; i < n; i++) {
    const x0 = i * pw + pw * MARGIN;
    const x1 = (i + 1) * pw - pw * MARGIN;
    const panel = localPart(`panel${i + 1}`, "enclosure", spec.pick(i + 1) ? "panel" : "panel-liso", x0, top, x1, bottom);
    children.push(panel);
    const win = archedTop(x0 + (x1 - x0) * 0.3, top + (bottom - top) * 0.2, x1 - (x1 - x0) * 0.3, bottom - (bottom - top) * 0.12);
    childShapes.push([polygon(panel.mask!, stroked(ink.ink, ink.line * 0.6)), polygon(win, filled(ink.deep, ink.ink, ink.line * 0.5))]);
  }
  const part: Part = { id: "fachada", role: "enclosure", geometryId: "fachada", anchors: {}, mask: quad(0, 0, w, h), children };
  return { part, shapes: [], childShapes };
}
