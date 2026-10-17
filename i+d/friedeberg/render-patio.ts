import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { composePatio } from "../../web/src/graphics/application/patio/index.ts";
import { DEFAULT_PATIO, type PatioConfig } from "../../web/src/graphics/config/patio.ts";
import { toSvg } from "../../web/src/graphics/renderers/svg/serialize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const num = (k: string) => (args[k] !== undefined ? Number(args[k]) : undefined);
const input: Partial<PatioConfig> = {
  ...(num("seed") !== undefined ? { seed: num("seed") } : {}),
  ...(num("detail") !== undefined ? { detail: num("detail") as PatioConfig["detail"] } : {}),
  ...(num("density") !== undefined ? { density: num("density") } : {}),
  ...(num("azimuth") !== undefined ? { azimuth: num("azimuth") } : {}),
  ...(num("towers") !== undefined ? { towers: num("towers") as PatioConfig["towers"] } : {}),
  ...(args.anomaly ? { anomaly: args.anomaly as PatioConfig["anomaly"] } : {}),
  ...(args.palette ? { palette: args.palette as PatioConfig["palette"] } : {}),
  ...(args.ornament ? { ornament: args.ornament.split(",") as PatioConfig["ornament"] } : {}),
};
const cfg = { ...DEFAULT_PATIO, ...input };
const out = composePatio(cfg);
const svg = toSvg(out.stages.flatMap((s) => s.shapes), out.width, out.height);
const outDir = args.out ?? join(here, "out", "patio");
mkdirSync(outDir, { recursive: true });
const anomaly = cfg.anomaly === "none" ? "base" : cfg.anomaly.split("-")[0];
const name = join(outDir, `patio-s${cfg.seed}-d${cfg.detail}-${anomaly}${cfg.palette === "friedeberg" ? "" : `-${cfg.palette}`}`);
writeFileSync(`${name}.svg`, svg);
const report = {
  config: cfg,
  stages: out.stages.map((s) => ({ name: s.name, trazos: s.shapes.length, provenance: s.provenance })),
  anchors: out.anchors,
};
writeFileSync(`${name}.stages.json`, JSON.stringify(report, null, 2));
console.log(`${name}.svg (${(svg.length / 1024).toFixed(0)} KB) ${out.stages.map((s) => `${s.name}=${s.shapes.length}`).join(" ")} anchors=${out.anchors.length}`);
