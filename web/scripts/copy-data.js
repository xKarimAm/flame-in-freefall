// Copies the data the site reads into web/public/data/.
// Prefers data/build/*.json (W1 output); falls back to contracts/golden/*.json.
// Always copies data/curated/*.json. Never invents numbers: files are copied byte for byte.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dest = join(root, "web", "public", "data");
mkdirSync(dest, { recursive: true });

const buildDir = join(root, "data", "build");
const useBuild =
  existsSync(join(buildDir, "experiments.json")) &&
  existsSync(join(buildDir, "tests.json"));

const sources = useBuild
  ? [
      [join(buildDir, "experiments.json"), "experiments.json"],
      [join(buildDir, "tests.json"), "tests.json"],
    ]
  : [
      [join(root, "contracts", "golden", "experiments.json"), "experiments.json"],
      [join(root, "contracts", "golden", "tests.json"), "tests.json"],
    ];

for (const [from, to] of sources) {
  copyFileSync(from, join(dest, to));
}

for (const name of ["moon.json", "incidents.json"]) {
  copyFileSync(join(root, "data", "curated", name), join(dest, name));
}

console.log(
  `data: copied ${useBuild ? "data/build" : "contracts/golden"} + data/curated -> web/public/data/`,
);
