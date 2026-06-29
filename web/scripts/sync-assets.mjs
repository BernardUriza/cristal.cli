// Copies the Mixamo character + animation FBX files from the repo root /Mixamo
// folder into web/public/models so Vite can serve them. These binaries are
// gitignored under public/models to avoid duplicating large files in git.
import { cp, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const srcDir = join(repoRoot, "Mixamo");
const destDir = resolve(__dirname, "..", "public", "models");

// Files the runtime currently loads. Add more here as the scene grows.
const FILES = ["character.fbx", "Rumba Dancing.fbx"];

await mkdir(destDir, { recursive: true });

for (const file of FILES) {
  const from = join(srcDir, file);
  try {
    await access(from);
  } catch {
    console.warn(`! Skipping missing source: ${from}`);
    continue;
  }
  const to = join(destDir, file);
  await cp(from, to);
  console.log(`✓ ${file} -> public/models/`);
}

console.log("Done. Run `npm run dev` to serve the scene.");
