import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, access } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const SRC_DIR = join(repoRoot, "Mixamo");
const OUT_DIR = resolve(__dirname, "..", "public", "models");

const CLIPS = [
  { src: "Idle.fbx", out: "idle" },
  { src: "Walking.fbx", out: "walking" },
  { src: "Running.fbx", out: "running" },
];

let convert;
try {
  ({ default: convert } = await import("fbx2gltf"));
} catch {
  console.error("fbx2gltf is not installed. Run: npm i -D fbx2gltf");
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

for (const clip of CLIPS) {
  const source = join(SRC_DIR, clip.src);
  try {
    await access(source);
  } catch {
    console.error(`! Missing source: ${source}`);
    continue;
  }
  const dest = join(OUT_DIR, clip.out);
  console.log(`Converting ${clip.src} -> ${clip.out}.glb ...`);
  const written = await convert(source, `${dest}.glb`, ["--binary", "--keep-attribute", "auto"]);
  console.log(`✓ Wrote ${written}`);
}
