import "./style.css";
import { loadAll } from "./data.js";

async function main(): Promise<void> {
  const app = document.getElementById("app")!;
  try {
    const data = await loadAll();
    app.innerHTML = "";
    const h = document.createElement("h1");
    h.textContent = "Flame in Freefall";
    const p = document.createElement("p");
    p.textContent =
      `Loaded ${data.experiments.length} investigations, ` +
      `${data.tests.length} test runs, ` +
      `${data.moon.atmospheres.length} atmospheres, ` +
      `${data.incidents.incidents.length} incidents.`;
    app.append(h, p);
  } catch (err) {
    app.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = `Could not load data: ${(err as Error).message}`;
    app.append(p);
  }
}

void main();
