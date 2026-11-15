// Copies the data the site reads into web/public/data/, byte for byte (no number is changed).
// Prefers data/build/*.json (pipeline output); falls back to contracts/golden/*.json.
// Always copies data/curated/*.json. Generated with Claude, SI-assisted.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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
for (const name of ["psi-text.json", "summaries.json", "moments.json", "library.json", "search.json", "coverage.json", "provenance.json", "dictionary.json"]) {
  if (existsSync(join(buildDir, name))) copyFileSync(join(buildDir, name), join(dest, name));
}
// Translation records: which model translated which keys, and when (read by the method page).
for (const name of ["es.meta.json", "hi.meta.json"]) {
  const from = join(root, "web", "src", "i18n", name);
  if (existsSync(from)) copyFileSync(from, join(dest, name));
}
// Contracts, served for download next to the data they validate (never edited here).
for (const name of ["curated.schema.json", "experiments.schema.json", "library.schema.json", "moments.schema.json", "psi-text.schema.json", "story.schema.json", "tests.schema.json"]) {
  const from = join(root, "contracts", name);
  if (existsSync(from)) copyFileSync(from, join(dest, name));
}
for (const name of ["moon.json", "incidents.json"]) copyFileSync(join(root, "data", "curated", name), join(dest, name));
// NASA chapter photographs (R13): the JSON record plus every image file it names
if (existsSync(join(root, "data", "curated", "pictures.json"))) {
  copyFileSync(join(root, "data", "curated", "pictures.json"), join(dest, "pictures.json"));
  mkdirSync(join(dest, "pictures"), { recursive: true });
  for (const name of readdirSync(join(root, "data", "curated", "pictures"))) {
    copyFileSync(join(root, "data", "curated", "pictures", name), join(dest, "pictures", name));
  }
}

console.log(`data: copied ${useBuild ? "data/build" : "contracts/golden (pipeline output missing)"} + data/curated -> web/public/data/`);
