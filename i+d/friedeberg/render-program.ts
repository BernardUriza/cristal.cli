import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { composeProgram } from "../../web/src/graphics/application/program/composeProgram.ts";
import { GRAMMAR_PROGRAMS, type GrammarProgramName } from "../../web/src/graphics/config/programs-grammar.ts";
import { toSvg } from "../../web/src/graphics/renderers/svg/serialize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const outDir = args.out ?? join(here, "out", "program");
const azimuth = args.azimuth !== undefined ? Number(args.azimuth) : 0.62;
const names = (args.only ? args.only.split(",") : Object.keys(GRAMMAR_PROGRAMS)) as GrammarProgramName[];
mkdirSync(outDir, { recursive: true });
for (const name of names) {
  const { narration, program } = GRAMMAR_PROGRAMS[name];
  const out = composeProgram(program, { width: 1400, height: 1000, palette: "friedeberg", azimuth });
  const svg = toSvg(out.stages.flatMap((s) => s.shapes), out.width, out.height);
  writeFileSync(join(outDir, `${name}.svg`), svg);
  const report = {
    narration,
    program,
    applied: out.scene.graph.applied,
    fallbacks: [...out.scene.graph.fallbacks, ...out.scene.layout.fallbacks],
    stages: out.stages.map((s) => ({ name: s.name, trazos: s.shapes.length, provenance: s.provenance })),
  };
  writeFileSync(join(outDir, `${name}.stages.json`), JSON.stringify(report, null, 2));
  console.log(`${name}: ${out.stages.map((s) => `${s.name}=${s.shapes.length}`).join(" ")} | ${out.stages[0].provenance?.params.reglas}`);
}
