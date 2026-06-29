import type { SymbolicArchetype } from "./symbolicBus";

const SIZE = 256;
const C = SIZE / 2;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polygon(cx: number, cy: number, r: number, sides: number, stroke: string, sw: number, rot = 0) {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides - Math.PI / 2 + rot;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="none" stroke="${stroke}" stroke-width="${sw}" filter="url(#glow)"/>`;
}

function concentricCircles(cx: number, cy: number, maxR: number, count: number, stroke: string, sw: number) {
  let out = "";
  for (let i = 1; i <= count; i++) {
    const r = (maxR * i) / count;
    const op = (1 - ((i - 1) / count) * 0.6).toFixed(2);
    out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" filter="url(#glow)"/>`;
  }
  return out;
}

function radialLines(cx: number, cy: number, r: number, count: number, stroke: string, sw: number) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = (i * 2 * Math.PI) / count;
    out += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(a)).toFixed(1)}" y2="${(cy + r * Math.sin(a)).toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" filter="url(#glow)"/>`;
  }
  return out;
}

function flowerOfLife(cx: number, cy: number, r: number, rings: number, stroke: string, sw: number) {
  const base = r / (rings + 1);
  let out = `<circle cx="${cx}" cy="${cy}" r="${base.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" filter="url(#glow)"/>`;
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

function glitchPattern(cx: number, cy: number, r: number, rng: () => number, stroke: string, accent: string, complexity: number, chaos: number) {
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

function core(color: string) {
  return `<circle cx="${C}" cy="${C}" r="30" fill="${color}" opacity="0.18" filter="url(#glow)"/>`;
}

function body(archetype: SymbolicArchetype, color: string, accent: string, rng: () => number): string {
  switch (archetype) {
    case "vision":
    case "memory":
      return (
        core(color) +
        flowerOfLife(C, C, 96, 3, color, 3.0) +
        polygon(C, C, 110, 3, accent, 3.4)
      );
    case "corruption":
      return (
        glitchPattern(C, C, 100, rng, color, accent, 6, 1.2) +
        polygon(C, C, 110, 4, color, 3.6, Math.PI / 4) +
        polygon(C, C, 78, 4, accent, 2.6)
      );
    case "moon":
    case "echo":
    default:
      return (
        core(color) +
        concentricCircles(C, C, 100, 5, color, 3.2) +
        radialLines(C, C, 100, 12, color, 2.0) +
        polygon(C, C, 72, 6, accent, 3.2)
      );
  }
}

export function generateGlyphSvg(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): string {
  const rng = mulberry32(seed + archetype.length * 131);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<defs>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
<feGaussianBlur stdDeviation="3.0" result="b"/>
<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<radialGradient id="bg"><stop offset="0%" stop-color="${color}" stop-opacity="0.10"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<circle cx="${C}" cy="${C}" r="118" fill="${color}" opacity="0.20" filter="url(#glow)"/>
<circle cx="${C}" cy="${C}" r="118" fill="none" stroke="${color}" stroke-width="4" opacity="0.92" filter="url(#glow)"/>
${body(archetype, color, accent, rng)}
</svg>`;
}

export function glyphSvgDataUri(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): string {
  const svg = generateGlyphSvg(archetype, color, accent, seed);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
