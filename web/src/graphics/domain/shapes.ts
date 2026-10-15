export type Vec2 = readonly [number, number];

export type Style = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  join?: "round" | "miter";
  glow?: boolean;
};

export type PathSegment =
  | { op: "M" | "L"; p: Vec2 }
  | { op: "A"; r: number; large: 0 | 1; sweep: 0 | 1; p: Vec2 }
  | { op: "Z" };

export type TransformOp = { translate: Vec2 } | { rotate: number };

export type Transform = TransformOp[];

export type Shape =
  | { kind: "polygon"; points: Vec2[]; style: Style }
  | { kind: "polyline"; points: Vec2[]; style: Style }
  | { kind: "circle"; cx: number; cy: number; r: number; style: Style }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; style: Style }
  | { kind: "line"; a: Vec2; b: Vec2; style: Style }
  | { kind: "rect"; x: number; y: number; w: number; h: number; style: Style }
  | { kind: "path"; segments: PathSegment[]; style: Style }
  | { kind: "group"; transform: Transform; children: Shape[] };

export type DisplayList = Shape[];

export const polygon = (points: Vec2[], style: Style): Shape => ({ kind: "polygon", points, style });
export const polyline = (points: Vec2[], style: Style): Shape => ({ kind: "polyline", points, style });
export const circle = (cx: number, cy: number, r: number, style: Style): Shape => ({ kind: "circle", cx, cy, r, style });
export const ellipse = (cx: number, cy: number, rx: number, ry: number, style: Style): Shape => ({ kind: "ellipse", cx, cy, rx, ry, style });
export const line = (a: Vec2, b: Vec2, style: Style): Shape => ({ kind: "line", a, b, style });
export const rect = (x: number, y: number, w: number, h: number, style: Style): Shape => ({ kind: "rect", x, y, w, h, style });
export const path = (segments: PathSegment[], style: Style): Shape => ({ kind: "path", segments, style });
export const group = (transform: Transform, children: Shape[]): Shape => ({ kind: "group", transform, children });

export function filled(fill: string, stroke: string, strokeWidth: number, extra: Partial<Style> = {}): Style {
  return { fill, stroke, strokeWidth, ...extra };
}

export function stroked(stroke: string, strokeWidth: number, extra: Partial<Style> = {}): Style {
  return { fill: "none", stroke, strokeWidth, ...extra };
}

export function solid(fill: string, extra: Partial<Style> = {}): Style {
  return { fill, ...extra };
}
