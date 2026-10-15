import type { PathSegment, Vec2 } from "../domain/shapes.ts";

export function fmt(n: number): string {
  return n.toFixed(1);
}

export function fmtPoint(p: Vec2): string {
  return `${fmt(p[0])},${fmt(p[1])}`;
}

export function pathData(segments: PathSegment[]): string {
  return segments
    .map((s) => {
      if (s.op === "Z") return "Z";
      if (s.op === "A") return `A ${fmt(s.r)} ${fmt(s.r)} 0 ${s.large} ${s.sweep} ${fmtPoint(s.p)}`;
      return `${s.op} ${fmtPoint(s.p)}`;
    })
    .join(" ");
}
