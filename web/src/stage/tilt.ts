// Generated with Muse Spark, SI-assisted.
// The three.js tilt for the lunar-gravity pages (stage view "tilt-lunar", acts 3 and 4): the chart
// tips into 3D to show three gravity planes — microgravity with the real tests, the empty
// Moon-gravity plane with its label, Earth gravity as a reference line. Points are the real placed
// tests; nothing decorative. Flat MeshBasicMaterial colours only; no lights, no shadows.
// The SVG chart stays the fallback (WebGL missing or reduced motion) and the accessible version;
// the tilt points are never clickable — selection stays on the SVG chart, panel and sheet.
import * as THREE from "three";
import type { Ctx, PlacedTest } from "../contract";
import type { Scales } from "./layout";

/** Camera ease on entering and leaving: 600 ms. */
export const TILT_MS = 600;
const WORLD_W = 8;
const WORLD_H = 6;
const LUNAR_Z = -1.6;
const EARTH_Z = 1.6;

export function easeOutCubic(k: number): number {
  const c = Math.min(1, Math.max(0, k));
  return 1 - Math.pow(1 - c, 3);
}

export interface Pose {
  pos: [number, number, number];
  look: [number, number, number];
}

/** Camera pose: flat and chart-like at k = 0, tipped to show the three planes at k = 1. Pure. */
export function tiltPose(k: number): Pose {
  const e = easeOutCubic(k);
  return { pos: [0, -5.2 * e, 8 - 3.6 * e], look: [0, 0.4 * e, -0.3 * e] };
}

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

export interface TiltView {
  element: HTMLElement;
  /** redraw points for the current beat; ids in `nearest` draw larger */
  update(placed: PlacedTest[], nearest: Set<string>, s: Scales): void;
  /** ease the camera to the tilted view (true) or back to flat (false) */
  setTilted(tilted: boolean): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

/**
 * Null when the tilt cannot run here: reduced motion set, or no WebGL context.
 * Any later runtime failure calls onError so the caller falls back to the SVG chart.
 */
export function mountTilt(container: HTMLElement, ctx: Ctx, onError: () => void): TiltView | null {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    if (!renderer.getContext()) {
      renderer.dispose();
      return null;
    }
  } catch {
    return null;
  }
  renderer.domElement.setAttribute("aria-hidden", "true"); // decorative duplicate: the SVG stays the accessible version
  let dead = false;
  const fail = (e: unknown): void => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    try {
      renderer.dispose();
    } catch {
      /* already broken */
    }
    container.replaceChildren();
    onError();
  };
  const t = ctx.t;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const dataBlue = cssVar("--data-on-dark", "#2491ff");
  const muted = cssVar("--muted-dark", "#dfe1e2");

  // microgravity plane: a quiet grid holding the real tests
  const grid = new THREE.GridHelper(WORLD_W, 12, muted, muted);
  grid.rotation.x = Math.PI / 2; // local depth becomes world height
  grid.scale.set(1, 1, WORLD_H / WORLD_W);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  scene.add(grid);

  // the empty Moon-gravity plane and the Earth-gravity reference line
  const lunar = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W, WORLD_H),
    new THREE.MeshBasicMaterial({ color: muted, transparent: true, opacity: 0.07, side: THREE.DoubleSide }),
  );
  lunar.position.z = LUNAR_Z;
  scene.add(lunar);
  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-WORLD_W / 2, -WORLD_H / 2, LUNAR_Z),
      new THREE.Vector3(WORLD_W / 2, -WORLD_H / 2, LUNAR_Z),
      new THREE.Vector3(WORLD_W / 2, WORLD_H / 2, LUNAR_Z),
      new THREE.Vector3(-WORLD_W / 2, WORLD_H / 2, LUNAR_Z),
    ]),
    new THREE.LineDashedMaterial({ color: muted, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.8 }),
  );
  border.computeLineDistances();
  scene.add(border);
  const earth = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-WORLD_W / 2, 0, EARTH_Z), new THREE.Vector3(WORLD_W / 2, 0, EARTH_Z)]),
    new THREE.LineBasicMaterial({ color: muted, transparent: true, opacity: 0.8 }),
  );
  scene.add(earth);

  // plane labels are HTML: readable, localised, and outside the canvas pixels
  const labels = document.createElement("div");
  labels.className = "tilt-labels";
  const microLabel = document.createElement("p");
  microLabel.className = "tilt-label";
  microLabel.textContent = t("ui.stage.microg-plane");
  const lunarLabel = document.createElement("p");
  lunarLabel.className = "tilt-label";
  lunarLabel.textContent = t("ui.stage.lunar-plane");
  const earthLabel = document.createElement("p");
  earthLabel.className = "tilt-label";
  earthLabel.textContent = t("ui.stage.earth-line");
  labels.append(microLabel, lunarLabel, earthLabel);
  container.append(renderer.domElement, labels);

  const baseMat = new THREE.PointsMaterial({ color: muted, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.55 });
  const nearMat = new THREE.PointsMaterial({ color: dataBlue, size: 6, sizeAttenuation: false, transparent: true, opacity: 1 });
  let base: THREE.Points | null = null;
  let near: THREE.Points | null = null;

  let raf = 0;
  let animToken = 0;
  let k = 0;
  const applyPose = (): void => {
    const p = tiltPose(k);
    camera.position.set(...p.pos);
    camera.lookAt(...p.look);
    renderer.render(scene, camera);
  };

  const toWorld = (px: number, py: number, s: Scales): [number, number] => {
    const w = s.plot.x1 - s.plot.x0;
    const h = s.plot.y1 - s.plot.y0;
    return [((px - s.plot.x0) / w - 0.5) * WORLD_W, (0.5 - (py - s.plot.y0) / h) * WORLD_H];
  };

  return {
    element: container,
    update(placed, nearest, s) {
      try {
        const basePos: number[] = [];
        const nearPos: number[] = [];
        for (const p of placed) {
          const [x, y] = toWorld(s.x(p.pressure_kpa), s.y(p.o2_pct), s);
          (nearest.has(p.id) ? nearPos : basePos).push(x, y, 0.02);
        }
        if (base) { scene.remove(base); base.geometry.dispose(); }
        if (near) { scene.remove(near); near.geometry.dispose(); }
        const baseGeo = new THREE.BufferGeometry();
        baseGeo.setAttribute("position", new THREE.Float32BufferAttribute(basePos, 3));
        base = new THREE.Points(baseGeo, baseMat);
        const nearGeo = new THREE.BufferGeometry();
        nearGeo.setAttribute("position", new THREE.Float32BufferAttribute(nearPos, 3));
        near = new THREE.Points(nearGeo, nearMat);
        scene.add(base, near);
        applyPose();
      } catch (e) { fail(e); }
    },
    setTilted(tilted) {
      const token = ++animToken;
      const from = k;
      const to = tilted ? 1 : 0;
      const start = performance.now();
      cancelAnimationFrame(raf);
      const step = (): void => {
        if (token !== animToken || dead) return;
        try {
          k = from + (to - from) * Math.min(1, (performance.now() - start) / TILT_MS);
          applyPose();
        } catch (e) { fail(e); return; }
        if (k !== to) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    resize(w, h) {
      if (w <= 0 || h <= 0) return;
      try {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        applyPose();
      } catch (e) { fail(e); }
    },
    dispose() {
      cancelAnimationFrame(raf);
      animToken++;
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      labels.remove();
    },
  };
}
