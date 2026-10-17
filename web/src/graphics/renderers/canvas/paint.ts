import { arcFromEndpoints } from "../../domain/geometry.ts";
import type { DisplayList, PathSegment, Shape, Style, Vec2 } from "../../domain/shapes.ts";

export interface Canvas2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  shadowBlur: number;
  shadowColor: string;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, anticlockwise?: boolean): void;
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, a0: number, a1: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
}

const GLOW_BLUR = 6;

function applyStyle(ctx: Canvas2D, s: Style): void {
  ctx.globalAlpha = s.opacity ?? 1;
  ctx.lineJoin = s.join ?? "miter";
  if (s.glow) {
    ctx.shadowBlur = GLOW_BLUR;
    ctx.shadowColor = s.stroke ?? s.fill ?? "#fff";
  } else {
    ctx.shadowBlur = 0;
  }
  if (s.fill && s.fill !== "none") {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  if (s.stroke && s.stroke !== "none") {
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = s.strokeWidth ?? 1;
    ctx.stroke();
  }
}

function tracePoints(ctx: Canvas2D, points: Vec2[], close: boolean): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  if (close) ctx.closePath();
}

function tracePath(ctx: Canvas2D, segments: PathSegment[]): void {
  ctx.beginPath();
  let cursor: Vec2 = [0, 0];
  for (const s of segments) {
    if (s.op === "Z") {
      ctx.closePath();
      continue;
    }
    if (s.op === "M") ctx.moveTo(s.p[0], s.p[1]);
    else if (s.op === "L") ctx.lineTo(s.p[0], s.p[1]);
    else {
      const a = arcFromEndpoints(cursor, s.p, s.r, s.large, s.sweep);
      ctx.arc(a.cx, a.cy, a.r, a.a0, a.a1, a.anticlockwise);
    }
    cursor = s.p;
  }
}

export function paintShape(ctx: Canvas2D, shape: Shape): void {
  switch (shape.kind) {
    case "polygon":
      tracePoints(ctx, shape.points, true);
      return applyStyle(ctx, shape.style);
    case "polyline":
      tracePoints(ctx, shape.points, false);
      return applyStyle(ctx, shape.style);
    case "circle":
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      return applyStyle(ctx, shape.style);
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
      return applyStyle(ctx, shape.style);
    case "line":
      tracePoints(ctx, [shape.a, shape.b], false);
      return applyStyle(ctx, shape.style);
    case "rect":
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
      return applyStyle(ctx, shape.style);
    case "path":
      tracePath(ctx, shape.segments);
      return applyStyle(ctx, shape.style);
    case "group":
      ctx.save();
      for (const op of shape.transform) {
        if ("rotate" in op) ctx.rotate((op.rotate * Math.PI) / 180);
        else ctx.translate(op.translate[0], op.translate[1]);
      }
      if (shape.clip) {
        tracePoints(ctx, shape.clip, true);
        ctx.clip();
      }
      shape.children.forEach((c) => paintShape(ctx, c));
      return ctx.restore();
  }
}

export function paintDisplayList(ctx: Canvas2D, list: DisplayList, scale = 1): void {
  ctx.save();
  if (scale !== 1) ctx.scale(scale, scale);
  list.forEach((s) => paintShape(ctx, s));
  ctx.restore();
}
