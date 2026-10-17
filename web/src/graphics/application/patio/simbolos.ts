import { regularPolygon } from "../../domain/geometry.ts";
import { line, polygon, stroked, type Shape, type Vec2 } from "../../domain/shapes.ts";
import { towers } from "./building.ts";
import { toWorld } from "./frame.ts";
import type { Surface } from "./surfaces.ts";
import type { Anchor, AnchorNormal, PatioContext, StageResult } from "./types.ts";

function facing(s: Surface): AnchorNormal {
  return Math.abs(s.face.normal[2]) >= Math.abs(s.face.normal[0]) ? "frente" : "lado";
}

function onFace(ctx: PatioContext, s: Surface, x: number, y: number): Vec2 {
  return ctx.projector.toScreen(toWorld(s.frame, x, y));
}

export function anchorMarks(anchors: readonly Anchor[], ink: string): Shape[] {
  const out: Shape[] = [];
  for (const a of anchors) {
    const r = Math.max(3, Math.min(a.sizePx * 0.12, 10));
    const [x, y] = a.screen;
    const thin = stroked(ink, 0.6, { opacity: 0.55 });
    out.push(line([x - r, y], [x + r, y], thin), line([x, y - r], [x, y + r], thin), polygon(regularPolygon(x, y, r * 0.6, 4), thin));
  }
  return out;
}

export function simbolos(ctx: PatioContext, surfaces: Surface[]): StageResult {
  const { plan } = ctx.building;
  const h = plan.layout.heights;
  const anchors: Anchor[] = [];
  const patio = plan.spaces.find((s) => s.kind === "courtyard")!;
  const corners = [[patio.rect.x0, patio.rect.z0], [patio.rect.x1, patio.rect.z1]].map(([x, z]) => ctx.projector.toScreen([x, 0, z]));
  anchors.push({ id: "patio-centro", kind: "patio-centro", screen: ctx.projector.toScreen([(patio.rect.x0 + patio.rect.x1) / 2, 0, (patio.rect.z0 + patio.rect.z1) / 2]), sizePx: Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) * 0.2, normal: "arriba" });
  for (const t of towers(ctx.building)) {
    const apex = ctx.projector.toScreen([(t.rect.x0 + t.rect.x1) / 2, t.height + h.roofSlab + h.towerRoof, (t.rect.z0 + t.rect.z1) / 2]);
    const base = [ctx.projector.toScreen([t.rect.x0, t.height, t.rect.z0]), ctx.projector.toScreen([t.rect.x1, t.height, t.rect.z1])];
    anchors.push({ id: `torre-cima:${t.id}`, kind: "torre-cima", screen: apex, sizePx: Math.hypot(base[1][0] - base[0][0], base[1][1] - base[0][1]) * 0.3, normal: "arriba" });
  }
  const windowed = new Set<string>();
  for (const s of surfaces) {
    if (s.role !== "muro-exterior" && s.role !== "torre") continue;
    const { width: w, height: hh } = s.frame;
    if (w < 3 || hh < 2.5) continue;
    const id = `${s.face.solid.id}`;
    anchors.push({ id: `muro-exterior:${id}`, kind: "muro-exterior", screen: onFace(ctx, s, w / 2, hh / 2), sizePx: Math.min(s.px.w, s.px.h) * 0.5, normal: facing(s) });
    anchors.push({ id: `cornisa:${id}`, kind: "cornisa", screen: onFace(ctx, s, w / 2, 0.5), sizePx: s.px.h * 0.12, normal: facing(s) });
    const space = plan.spaces.find((sp) => sp.id === s.space);
    if (space?.kind === "room" && !windowed.has(space.id)) {
      windowed.add(space.id);
      anchors.push({ id: `ventana:${space.id}`, kind: "ventana", screen: onFace(ctx, s, w / 2, hh - 1.9), sizePx: s.px.h * 0.3, normal: facing(s) });
    }
  }
  return {
    anchors,
    stage: {
      name: "símbolos",
      shapes: anchorMarks(anchors, ctx.pal.ink),
      provenance: {
        algorithm: "anclas para el integrador de motivos: centro del patio, cima de cada torre, centro y cornisa de cada muro exterior grande, una ventana por sala",
        params: { anclas: anchors.length, torres: towers(ctx.building).length, salas_con_ventana: windowed.size },
        decision: "aquí no se dibujan figuras: sólo una cruz y un rombo de tinta por ancla; las figuras (manos, sirenas, ojos) las coloca otro módulo sobre `anchors`",
      },
    },
  };
}
