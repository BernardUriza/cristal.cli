import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { composeSheets } from "../../web/src/graphics/application/drawings/index.ts";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../web/src/graphics/config/programs.ts";
import { pairKey } from "../../web/src/graphics/domain/architecture/program.ts";
import { toSvg } from "../../web/src/graphics/renderers/svg/serialize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const doorAt = args.door !== undefined ? Number(args.door) : undefined;
const layout = doorAt === undefined ? CLOISTER_LAYOUT : { ...CLOISTER_LAYOUT, openingOverrides: { [pairKey("sala-n1", "gal-n")]: { at: doorAt } } };
const { building, report, sheets } = composeSheets(CLOISTER_PROGRAM, layout);
const outDir = args.out ?? join(here, "out", "building");
mkdirSync(outDir, { recursive: true });
const suffix = doorAt === undefined ? "" : `-door${doorAt}`;
for (const sheet of sheets) {
  const file = join(outDir, `${sheet.kind}${suffix}.svg`);
  writeFileSync(file, toSvg(sheet.list, sheet.projector.viewport.width, sheet.projector.viewport.height));
  console.log(`${file} (${sheet.list.length} shapes, ${sheet.projector.pxPerMeter.toFixed(1)} px/m)`);
}
writeFileSync(join(outDir, `building${suffix}.json`), JSON.stringify({ plan: building.plan, solids: building.solids.length, bounds: building.bounds }, null, 2));
writeFileSync(join(outDir, `validation${suffix}.json`), JSON.stringify(report, null, 2));
console.log(`validation ok=${report.ok} geometric=${report.geometric.length} architectural=${report.architectural.length} structural=${report.structural.status}`);
