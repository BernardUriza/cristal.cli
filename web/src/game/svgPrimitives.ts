export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GLOW = 'filter="url(#glow)"';

export function pt(x: number, y: number): string {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

export function regularPoints(cx: number, cy: number, r: number, sides: number, rot = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides - Math.PI / 2 + rot;
    pts.push(pt(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts.join(" ");
}

export function starPoints(cx: number, cy: number, rOuter: number, rInner: number, tips: number, rot = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < tips * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / tips - Math.PI / 2 + rot;
    pts.push(pt(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts.join(" ");
}

export function polygon(cx: number, cy: number, r: number, sides: number, stroke: string, sw: number, rot = 0, fx = GLOW) {
  return `<polygon points="${regularPoints(cx, cy, r, sides, rot)}" fill="none" stroke="${stroke}" stroke-width="${sw}" ${fx}/>`;
}

export function concentricCircles(cx: number, cy: number, maxR: number, count: number, stroke: string, sw: number, fx = GLOW) {
  let out = "";
  for (let i = 1; i <= count; i++) {
    const r = (maxR * i) / count;
    const op = (1 - ((i - 1) / count) * 0.6).toFixed(2);
    out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" ${fx}/>`;
  }
  return out;
}

export function radialLines(cx: number, cy: number, r: number, count: number, stroke: string, sw: number, fx = GLOW, from = 0, span = 2 * Math.PI) {
  let out = "";
  const closed = span >= 2 * Math.PI - 1e-9;
  const steps = closed ? count : count - 1;
  for (let i = 0; i < count; i++) {
    const a = from + (i * span) / Math.max(steps, 1);
    out += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + r * Math.cos(a)).toFixed(1)}" y2="${(cy + r * Math.sin(a)).toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" ${fx}/>`;
  }
  return out;
}

export function flowerOfLife(cx: number, cy: number, r: number, rings: number, stroke: string, sw: number, fx = GLOW) {
  const base = r / (rings + 1);
  let out = `<circle cx="${cx}" cy="${cy}" r="${base.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" ${fx}/>`;
  for (let ring = 1; ring <= rings; ring++) {
    const count = 6 * ring;
    const ringR = base * ring;
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count + ((ring % 2) * Math.PI) / count;
      const ccx = cx + ringR * Math.cos(a);
      const ccy = cy + ringR * Math.sin(a);
      const op = (1 - ring * 0.15).toFixed(2);
      out += `<circle cx="${ccx.toFixed(1)}" cy="${ccy.toFixed(1)}" r="${base.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`;
    }
  }
  return out;
}

export function glitchPattern(cx: number, cy: number, r: number, rng: Rng, stroke: string, accent: string, complexity: number, chaos: number) {
  let out = "";
  const segments = 5 + complexity;
  for (let i = 0; i < segments; i++) {
    const x = cx - r + rng() * r * 2;
    const y = cy - r + rng() * r * 2;
    const w = 10 + rng() * 90;
    const h = 2 + rng() * 16;
    const offset = (rng() - 0.5) * 20 * chaos;
    const color = rng() > 0.5 ? stroke : accent;
    out += `<rect x="${(x + offset).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.8"/>`;
  }
  for (let i = 0; i < 12; i++) {
    const y = cy - r + i * r * 0.17;
    if (rng() < 0.4) {
      out += `<line x1="${(cx - r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + r).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${stroke}" stroke-width="1" opacity="0.3"/>`;
    }
  }
  return out;
}

export function logSpiralPoints(cx: number, cy: number, a: number, b: number, turns: number, steps: number, mirror = false, rot = 0): string {
  const pts: string[] = [];
  const total = turns * 2 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * total;
    const r = a * Math.exp(b * t);
    const ang = (mirror ? -t : t) + rot;
    pts.push(pt(cx + r * Math.cos(ang), cy + r * Math.sin(ang)));
  }
  return pts.join(" ");
}
