// Converts the Mixamo character (with its baked animation) to a web-ready GLB.
//
// The /Mixamo FBX files are version 6100 (FBX 2010), which three.js's FBXLoader
// cannot read. FBX2glTF (Autodesk FBX SDK based) handles the legacy format. We
// convert "Rumba Dancing.fbx" because that download bundles mesh + skeleton +
// animation in one file, producing a self-contained GLB.
//
// Usage:
//   npm i -D fbx2gltf        # one-time, pulls the platform binary (~50MB)
//   npm run convert-character
//
// Output: web/public/models/character.glb (committed to the repo).
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, access } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const SOURCE = join(repoRoot, "Mixamo", "Rumba Dancing.fbx");
const OUT_DIR = resolve(__dirname, "..", "public", "models");
const OUT = join(OUT_DIR, "character"); // FBX2glTF appends .glb

let convert;
try {
  ({ default: convert } = await import("fbx2gltf"));
} catch {
  console.error("fbx2gltf is not installed. Run: npm i -D fbx2gltf");
  process.exit(1);
}

try {
  await access(SOURCE);
} catch {
  console.error(`Source FBX not found: ${SOURCE}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

console.log(`Converting ${SOURCE} -> ${OUT}.glb ...`);
// PBR (MeshStandardMaterial) output so the character is lit by the scene.
const dest = await convert(SOURCE, `${OUT}.glb`, ["--binary"]);
console.log(`✓ Wrote ${dest}`);
