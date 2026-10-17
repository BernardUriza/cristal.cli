import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MOTIF_IDS, MOTIFS, type MotifParams } from "../../web/src/graphics/domain/motifs/figures/index.ts";
import { shapeToSvg } from "../../web/src/graphics/renderers/svg/serialize.ts";
import { motifThumbnailSvg, THUMBNAIL_STYLE } from "../../web/src/graphics/renderers/svg/motifThumbnail.ts";
import { mulberry32 } from "../../web/src/shared/rng.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "motifs");
mkdirSync(outDir, { recursive: true });

const CELL = 260;
const DETAILS: MotifParams["detail"][] = [1, 2, 3];
const cols = DETAILS.length;
const rows = MOTIF_IDS.length;
const parts: string[] = [`<rect width="${CELL * cols + 160}" height="${CELL * rows}" fill="#06080a"/>`];

MOTIF_IDS.forEach((id, row) => {
  for (const detail of [1, 3] as const) writeFileSync(join(outDir, `${id}-d${detail}.svg`), motifThumbnailSvg(id, 320, detail));
  const motif = MOTIFS[id];
  parts.push(`<text x="12" y="${row * CELL + CELL / 2}" fill="#9ef0c0" font-family="monospace" font-size="18">${motif.name}</text>`);
  DETAILS.forEach((detail, col) => {
    const cx = 160 + col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    const params: MotifParams = { size: CELL * 0.8, detail, ...THUMBNAIL_STYLE };
    const drawing = motif.draw(cx, cy, params, mulberry32(7));
    parts.push(...drawing.shapes.map(shapeToSvg));
    const { size: _s, detail: _d, anchors: _a, ...ornament } = drawing.provenance.params;
    const label = Object.entries(ornament).map(([k, v]) => `${k}=${v}`).join(" ").slice(0, 44);
    parts.push(`<text x="${cx - CELL / 2 + 8}" y="${row * CELL + 16}" fill="#5c8a70" font-family="monospace" font-size="9">d${detail} ${label}</text>`);
  });
});

const w = CELL * cols + 160;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${CELL * rows}" width="${w}" height="${CELL * rows}">\n${parts.join("\n")}\n</svg>`;
writeFileSync(join(outDir, "pared.svg"), svg);
console.log(`${join(outDir, "pared.svg")} (${(svg.length / 1024).toFixed(0)} KB), ${MOTIF_IDS.length} motivos`);
