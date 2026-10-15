import { logSpiralPoints, pt, regularPoints, starPoints } from "./svgPrimitives.ts";

export type Ink = { ink: string; a: string; b: string; c: string };

export function visible(px: number, minPx = 5): boolean {
  return px >= minPx;
}

export function greca(x: number, y: number, w: number, h: number, cells: number, ink: Ink, sw: number): string {
  const u = w / cells;
  const k = u / 4;
  let d = `M ${pt(x, y + h)}`;
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    d += ` L ${pt(ox, y)} L ${pt(ox + 3 * k, y)} L ${pt(ox + 3 * k, y + h * 0.65)} L ${pt(ox + k, y + h * 0.65)} L ${pt(ox + k, y + h * 0.33)} L ${pt(ox + 2 * k, y + h * 0.33)} L ${pt(ox + 2 * k, y + h * 0.5)} L ${pt(ox + 4 * k, y + h * 0.5)} L ${pt(ox + 4 * k, y + h)}`;
  }
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${ink.b}" stroke="${ink.ink}" stroke-width="${sw}"/><path d="${d}" fill="none" stroke="${ink.ink}" stroke-width="${sw}" stroke-linejoin="miter"/>`;
}

export function chevronBand(x: number, y: number, w: number, h: number, cells: number, ink: Ink, sw: number, dots = false): string {
  const u = w / cells;
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${ink.a}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    out += `<polygon points="${pt(ox, y + h)} ${pt(ox + u / 2, y)} ${pt(ox + u, y + h)}" fill="${ink.b}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
    if (dots) out += `<circle cx="${(ox + u / 2).toFixed(1)}" cy="${(y + h * 0.62).toFixed(1)}" r="${(u * 0.1).toFixed(1)}" fill="${ink.ink}"/>`;
  }
  return out;
}

export function helixBand(x: number, y: number, w: number, h: number, turns: number, ink: Ink, sw: number): string {
  const steps = Math.max(8, Math.round(turns * 12));
  const amp = w * 0.5;
  const cx = x + w / 2;
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${ink.a}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
  const curve = (phase: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push(pt(cx + amp * Math.sin(t * turns * 2 * Math.PI + phase), y + h * t));
    }
    return pts;
  };
  const a = curve(0);
  const b = curve(Math.PI);
  const band = [...a, ...b.reverse()].join(" ");
  out += `<polygon points="${band}" fill="${ink.b}" stroke="${ink.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  out += `<polyline points="${curve(Math.PI / 2).join(" ")}" fill="none" stroke="${ink.ink}" stroke-width="${sw}" opacity="0.7"/>`;
  return out;
}

export function fan(cx: number, cy: number, r: number, rays: number, from: number, span: number, ink: Ink, sw: number): string {
  let out = "";
  for (let i = 0; i < rays; i++) {
    const a0 = from + (i * span) / rays;
    const a1 = from + ((i + 1) * span) / rays;
    out += `<polygon points="${pt(cx, cy)} ${pt(cx + r * Math.cos(a0), cy + r * Math.sin(a0))} ${pt(cx + r * Math.cos(a1), cy + r * Math.sin(a1))}" fill="${i % 2 ? ink.a : ink.b}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
  }
  return out;
}

export function rosette(cx: number, cy: number, r: number, petals: number, ink: Ink, sw: number, level: number): string {
  let out = `<polygon points="${starPoints(cx, cy, r, r * 0.55, petals)}" fill="${ink.a}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
  out += `<polygon points="${regularPoints(cx, cy, r * 0.5, petals, Math.PI / petals)}" fill="${ink.b}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
  if (level > 1 && visible(r * 0.3)) {
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.22).toFixed(1)}" fill="${ink.c}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
    for (let i = 0; i < petals; i++) {
      const a = (i * 2 * Math.PI) / petals - Math.PI / 2;
      out += `<circle cx="${(cx + r * 0.78 * Math.cos(a)).toFixed(1)}" cy="${(cy + r * 0.78 * Math.sin(a)).toFixed(1)}" r="${(r * 0.07).toFixed(1)}" fill="${ink.ink}"/>`;
    }
  }
  return out;
}

export function volutePair(cx: number, cy: number, r: number, ink: Ink, sw: number, level: number): string {
  let out = "";
  for (const side of [-1, 1]) {
    const vx = cx + side * r * 1.9;
    out += `<polyline points="${logSpiralPoints(vx, cy, r * 0.12, 0.28, 1.6, 48, side < 0, Math.PI)}" fill="none" stroke="${ink.ink}" stroke-width="${sw}"/>`;
    if (level > 1 && visible(r * 0.4)) {
      out += `<polyline points="${logSpiralPoints(vx, cy, r * 0.06, 0.28, 1.2, 32, side < 0, Math.PI)}" fill="none" stroke="${ink.c}" stroke-width="${sw * 0.8}"/>`;
      out += `<circle cx="${vx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.1).toFixed(1)}" fill="${ink.ink}"/>`;
    }
  }
  return out;
}

export function dotRow(x: number, y: number, w: number, n: number, r: number, fill: string): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += `<circle cx="${(x + (w / n) * (i + 0.5)).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"/>`;
  }
  return out;
}

export function sierpinski(cx: number, cy: number, r: number, depth: number, fill: string, ink: string, sw: number): string {
  const tri = (x: number, y: number, s: number, d: number): string => {
    if (d === 0 || !visible(s)) return `<polygon points="${regularPoints(x, y, s, 3)}" fill="${fill}" stroke="${ink}" stroke-width="${sw}"/>`;
    const h = s / 2;
    return tri(x, y - h, h, d - 1) + tri(x - h * Math.cos(Math.PI / 6), y + h / 2, h, d - 1) + tri(x + h * Math.cos(Math.PI / 6), y + h / 2, h, d - 1);
  };
  return tri(cx, cy, r, depth);
}

export function arcPath(cx: number, cy: number, r: number, pointed = false): string {
  if (!pointed) return `M ${pt(cx - r, cy)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pt(cx + r, cy)}`;
  const R = r * 1.3;
  return `M ${pt(cx - r, cy)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${pt(cx, cy - r * 1.25)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${pt(cx + r, cy)}`;
}

export function nestedArches(cx: number, cy: number, r: number, count: number, ink: Ink, sw: number, pointed = false): string {
  let out = "";
  for (let k = 1; k <= count; k++) {
    const rk = r * (1 - 0.12 * k);
    out += `<path d="${arcPath(cx, cy, rk, pointed)}" fill="none" stroke="${k % 2 ? ink.c : ink.ink}" stroke-width="${(sw * (1.6 - k * 0.2)).toFixed(2)}"/>`;
  }
  return out;
}

export function voussoirs(cx: number, cy: number, rIn: number, rOut: number, n: number, ink: Ink, sw: number, level: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i * Math.PI) / n;
    const a1 = Math.PI + ((i + 1) * Math.PI) / n;
    const p = [pt(cx + rIn * Math.cos(a0), cy + rIn * Math.sin(a0)), pt(cx + rOut * Math.cos(a0), cy + rOut * Math.sin(a0)), pt(cx + rOut * Math.cos(a1), cy + rOut * Math.sin(a1)), pt(cx + rIn * Math.cos(a1), cy + rIn * Math.sin(a1))].join(" ");
    const key = i === Math.floor(n / 2);
    out += `<polygon points="${p}" fill="${key ? ink.c : i % 2 === 0 ? ink.a : ink.b}" stroke="${ink.ink}" stroke-width="${sw}"/>`;
    const am = (a0 + a1) / 2;
    const rm = (rIn + rOut) / 2;
    const size = (rOut - rIn) * 0.22;
    if (level > 1 && visible(size * 2, 4)) {
      const mx = cx + rm * Math.cos(am);
      const my = cy + rm * Math.sin(am);
      out += key && level > 2 ? rosette(mx, my, size * 1.6, 6, ink, sw * 0.7, level - 1) : `<polygon points="${regularPoints(mx, my, size, 4, am)}" fill="${ink.ink}"/>`;
    }
  }
  return out;
}

export function pointedRingPath(cx: number, cy: number, rOut: number, rIn: number): string {
  const Ro = rOut * 1.3;
  const Ri = rIn * 1.3;
  return `M ${pt(cx - rOut, cy)} A ${Ro.toFixed(1)} ${Ro.toFixed(1)} 0 0 1 ${pt(cx, cy - rOut * 1.25)} A ${Ro.toFixed(1)} ${Ro.toFixed(1)} 0 0 1 ${pt(cx + rOut, cy)} L ${pt(cx + rIn, cy)} A ${Ri.toFixed(1)} ${Ri.toFixed(1)} 0 0 0 ${pt(cx, cy - rIn * 1.25)} A ${Ri.toFixed(1)} ${Ri.toFixed(1)} 0 0 0 ${pt(cx - rIn, cy)} Z`;
}
