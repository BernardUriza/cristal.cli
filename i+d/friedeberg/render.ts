import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTES, renderFriedeberg } from "../../web/src/game/friedebergSvg.ts";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const seed = Number(args.seed ?? 7);
const density = Number(args.density ?? 0.6);
const complexity = Number(args.complexity ?? 3);
const palette = PALETTES[args.palette ?? "friedeberg"];
const { svg, scene } = renderFriedeberg({ seed, density, complexity, palette });
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const base = join(outDir, `friedeberg-s${seed}-d${density}-c${complexity}`);
writeFileSync(`${base}.svg`, svg);
writeFileSync(`${base}.scene.json`, JSON.stringify(scene, null, 2));
console.log(`${base}.svg (${(svg.length / 1024).toFixed(0)} KB)`);
