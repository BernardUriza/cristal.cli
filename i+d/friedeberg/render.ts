import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { composeIllustration } from "../../web/src/graphics/application/compose.ts";
import { presetInput } from "../../web/src/graphics/config/presets.ts";
import type { ConfigInput } from "../../web/src/graphics/config/types.ts";
import { toSvg } from "../../web/src/graphics/renderers/svg/serialize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const base: ConfigInput = args.preset ? presetInput(args.preset) : {};
const input: ConfigInput = {
  ...base,
  ...(args.seed ? { seed: Number(args.seed) } : {}),
  ...(args.density ? { density: Number(args.density) } : {}),
  ...(args.complexity ? { complexity: Number(args.complexity) } : {}),
  ...(args.palette ? { palette: args.palette as ConfigInput["palette"] } : {}),
  ...(args.symmetry ? { symmetry: args.symmetry as ConfigInput["symmetry"] } : {}),
};
const ill = composeIllustration(input);
const { seed, density, complexity } = ill.cfg.art;
const svg = toSvg(ill.layers, ill.width, ill.height);
const outDir = args.out ?? join(here, "out");
mkdirSync(outDir, { recursive: true });
const name = join(outDir, `friedeberg-s${seed}-d${density}-c${complexity}`);
writeFileSync(`${name}.svg`, svg);
writeFileSync(`${name}.scene.json`, JSON.stringify(ill.architecture, null, 2));
console.log(`${name}.svg (${(svg.length / 1024).toFixed(0)} KB)`);
