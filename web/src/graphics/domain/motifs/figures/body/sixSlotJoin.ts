import { polygonBounds } from "../../../bezier.ts";
import type { Vec2 } from "../../../shapes.ts";
import { crossing } from "./contact.ts";
import { unitPolygon } from "./kinds.ts";
import { SIX_SLOT_JOIN as J, SIX_SLOT_PLAN, type SixSlot } from "./tuning.ts";

export type JoinedPiece = { id: string; part: SixSlot; motif: string; at: Vec2; size: number; flip: boolean };

type Poly = Vec2[];

const local = (motif: string, size: number, flip: boolean): Poly => unitPolygon({ motif }).map(([x, y]): Vec2 => [(flip ? -x : x) * size, y * size]);

const moved = (p: Poly, at: Vec2): Poly => p.map(([x, y]): Vec2 => [x + at[0], y + at[1]]);

const rowAt = (p: Poly, share: number) => {
  const b = polygonBounds(p);
  const y = b.minY + share * (b.maxY - b.minY);
  return { y, span: crossing(p, 1, y) };
};

const sizeOf = (part: SixSlot) => SIX_SLOT_PLAN.find((s) => s.part === part)!;

/** A piece on the `side` (−1 left, mirrored; +1 right) of its host: its inner edge on the contact point, sunk `overlap` of its width into the host. */
function beside(motif: string, size: number, side: 1 | -1, contact: Vec2): { at: Vec2; flip: boolean } {
  const flip = side < 0;
  const p = local(motif, size, flip);
  const b = polygonBounds(p);
  const cy = (b.minY + b.maxY) / 2;
  const row = crossing(p, 1, cy) ?? [b.minX, b.maxX];
  const inner = side > 0 ? row[0] : row[1];
  const sink = J.overlap * (b.maxX - b.minX) * side;
  return { at: [contact[0] - inner - sink, contact[1] - cy], flip };
}

function widest(trunk: Poly, side: 1 | -1): Vec2 {
  const [s0, s1] = J.shoulders;
  let best: Vec2 | undefined;
  for (let k = 0; k <= 12; k++) {
    const { y, span } = rowAt(trunk, s0 + ((s1 - s0) * k) / 12);
    if (!span) continue;
    const x = side > 0 ? span[1] : span[0];
    if (!best || x * side > best[0] * side) best = [x, y];
  }
  return best ?? [0, 0];
}

/** The six slots hung on one trunk (the body, else the head) through contacts on its silhouette, so the figure is one connected mass. */
export function joinSixSlots(motifs: Partial<Record<SixSlot, string>>): JoinedPiece[] | undefined {
  const trunkPart: SixSlot | undefined = motifs.cuerpo ? "cuerpo" : motifs.cabeza ? "cabeza" : undefined;
  if (!trunkPart) return undefined;
  const out: JoinedPiece[] = [];
  const push = (part: SixSlot, at: Vec2, flip: boolean, id: string = part) => out.push({ id, part, motif: motifs[part]!, at, size: sizeOf(part).size, flip });
  const trunk = local(motifs[trunkPart]!, sizeOf(trunkPart).size, false);
  const tb = polygonBounds(trunk);
  let head: Poly | undefined = trunkPart === "cabeza" ? trunk : undefined;
  push(trunkPart, [0, 0], false);
  if (motifs.cabeza && trunkPart === "cuerpo") {
    const top = rowAt(trunk, 0.03).span ?? [tb.minX, tb.maxX];
    const p = local(motifs.cabeza, sizeOf("cabeza").size, false);
    const b = polygonBounds(p);
    const cx = (b.minX + b.maxX) / 2;
    const bottom = crossing(p, 0, cx)?.[1] ?? b.maxY;
    const at: Vec2 = [(top[0] + top[1]) / 2 - cx, tb.minY - bottom + J.overlap * (b.maxY - b.minY)];
    head = moved(p, at);
    push("cabeza", at, false);
  }
  if (motifs.manos) for (const side of [-1, 1] as const) {
    const { at, flip } = beside(motifs.manos, sizeOf("manos").size, side, widest(trunk, side));
    push("manos", at, flip, `manos-${side < 0 ? 1 : 2}`);
  }
  if (motifs.cola) {
    const { y, span } = rowAt(trunk, J.tailRow);
    push("cola", beside(motifs.cola, sizeOf("cola").size, 1, [span ? span[1] : tb.maxX, y]).at, false);
  }
  if (motifs.pies) {
    const { span } = rowAt(trunk, J.footRow);
    const [a, b] = span ?? [tb.minX, tb.maxX];
    const dx = Math.min(sizeOf("pies").pair ?? 0, ((b - a) / 2) * J.pairShare);
    for (const side of [-1, 1] as const) {
      const p = local(motifs.pies, sizeOf("pies").size, side < 0);
      const pb = polygonBounds(p);
      const x = (a + b) / 2 + side * dx;
      const cx = (pb.minX + pb.maxX) / 2;
      const floor = crossing(trunk, 0, x)?.[1] ?? tb.maxY;
      const top = crossing(p, 0, cx)?.[0] ?? pb.minY;
      push("pies", [x - cx, floor - top - J.overlap * (pb.maxY - pb.minY)], side < 0, `pies-${side < 0 ? 1 : 2}`);
    }
  }
  if (motifs.ojos) {
    const host = head ?? trunk;
    const hb = polygonBounds(host);
    const y = head ? (hb.minY + hb.maxY) / 2 + J.eyeDy : rowAt(host, J.eyeRow).y;
    const span = crossing(host, 1, y) ?? [hb.minX, hb.maxX];
    const centre: Vec2 = [head ? (hb.minX + hb.maxX) / 2 : (span[0] + span[1]) / 2, y];
    const dx = Math.min(sizeOf("ojos").pair ?? 0, ((span[1] - span[0]) / 2) * J.pairShare * 0.5);
    for (const side of [-1, 1] as const) {
      const pb = polygonBounds(local(motifs.ojos, sizeOf("ojos").size, side < 0));
      push("ojos", [centre[0] + side * dx - (pb.minX + pb.maxX) / 2, centre[1] - (pb.minY + pb.maxY) / 2], side < 0, `ojos-${side < 0 ? 1 : 2}`);
    }
  }
  const order = SIX_SLOT_PLAN.map((s) => s.part);
  return out.sort((x, y) => order.indexOf(x.part) - order.indexOf(y.part));
}
