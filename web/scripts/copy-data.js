// Copies the data the site reads into web/public/data/, byte for byte (no number is changed).
// Prefers data/build/*.json (pipeline output); falls back to contracts/golden/*.json.
// Always copies data/curated/*.json. Generated with Claude, SI-assisted.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dest = join(root, "web", "public", "data");
mkdirSync(dest, { recursive: true });

const buildDir = join(root, "data", "build");
const goldenDir = join(root, "contracts", "golden");
const useBuild = ["experiments.json", "tests.json"].every((name) => existsSync(join(buildDir, name)));
const from = useBuild ? buildDir : goldenDir;

for (const name of ["experiments.json", "tests.json"]) copyFileSync(join(from, name), join(dest, name));
for (const name of ["psi-text.json", "summaries.json", "moments.json", "library.json"]) {
  if (existsSync(join(buildDir, name))) copyFileSync(join(buildDir, name), join(dest, name));
}
for (const name of ["moon.json", "incidents.json"]) copyFileSync(join(root, "data", "curated", name), join(dest, name));

console.log(`data: copied ${useBuild ? "data/build" : "contracts/golden (pipeline output missing)"} + data/curated -> web/public/data/`);
