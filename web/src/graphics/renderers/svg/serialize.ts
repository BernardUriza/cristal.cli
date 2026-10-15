import type { DisplayList, Shape, Style, Transform } from "../../domain/shapes.ts";
import { fmt, fmtPoint, pathData } from "../pathData.ts";

const GLOW_FILTER = `<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.0" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

function styleAttrs(s: Style): string {
  let out = ` fill="${s.fill ?? "none"}"`;
  if (s.stroke) out += ` stroke="${s.stroke}" stroke-width="${fmt(s.strokeWidth ?? 1)}"`;
  if (s.opacity !== undefined) out += ` opacity="${s.opacity}"`;
  if (s.join) out += ` stroke-linejoin="${s.join}"`;
  if (s.glow) out += ` filter="url(#glow)"`;
  return out;
}

function transformAttr(ops: Transform): string {
  return ops.map((op) => ("rotate" in op ? `rotate(${op.rotate})` : `translate(${fmt(op.translate[0])} ${fmt(op.translate[1])})`)).join(" ");
}

export function shapeToSvg(shape: Shape): string {
  switch (shape.kind) {
    case "polygon":
      return `<polygon points="${shape.points.map(fmtPoint).join(" ")}"${styleAttrs(shape.style)}/>`;
    case "polyline":
      return `<polyline points="${shape.points.map(fmtPoint).join(" ")}"${styleAttrs(shape.style)}/>`;
    case "circle":
      return `<circle cx="${fmt(shape.cx)}" cy="${fmt(shape.cy)}" r="${fmt(shape.r)}"${styleAttrs(shape.style)}/>`;
    case "ellipse":
      return `<ellipse cx="${fmt(shape.cx)}" cy="${fmt(shape.cy)}" rx="${fmt(shape.rx)}" ry="${fmt(shape.ry)}"${styleAttrs(shape.style)}/>`;
    case "line":
      return `<line x1="${fmt(shape.a[0])}" y1="${fmt(shape.a[1])}" x2="${fmt(shape.b[0])}" y2="${fmt(shape.b[1])}"${styleAttrs(shape.style)}/>`;
    case "rect":
      return `<rect x="${fmt(shape.x)}" y="${fmt(shape.y)}" width="${fmt(shape.w)}" height="${fmt(shape.h)}"${styleAttrs(shape.style)}/>`;
    case "path":
      return `<path d="${pathData(shape.segments)}"${styleAttrs(shape.style)}/>`;
    case "group":
      return `<g transform="${transformAttr(shape.transform)}">${shape.children.map(shapeToSvg).join("")}</g>`;
  }
}

function usesGlow(list: DisplayList): boolean {
  return list.some((s) => (s.kind === "group" ? usesGlow(s.children) : s.style.glow === true));
}

export function toSvg(list: DisplayList, width: number, height: number, defs = ""): string {
  const allDefs = (usesGlow(list) ? GLOW_FILTER : "") + defs;
  const body = list.map(shapeToSvg).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${allDefs ? `<defs>${allDefs}</defs>\n` : ""}${body}\n</svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
