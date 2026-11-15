// Generated with Muse Spark, SI-assisted.
// The three.js tilt for the lunar-gravity pages (stage view "tilt-lunar", acts 3 and 4): the chart
// tips into 3D to show three gravity planes — microgravity on top with the real tests, the empty
// Moon-gravity plane in the middle with its yellow Moon box, Earth gravity as a thin reference
// strip at the bottom. Points are the real placed tests; nothing decorative. Flat
// MeshBasicMaterial colours only; no lights, no shadows.
// The SVG chart stays the fallback (WebGL missing or reduced motion) and the accessible version;
// the tilt points are never clickable — selection stays on the SVG chart, panel and sheet.
import * as THREE from "three";
import { OUTCOME_GROUP } from "../contract";
import type { Atmosphere, Ctx, Lens, Outcome, PlacedTest, StageState, StageView } from "../contract";
import type { RefPlan } from "./plan";
import type { Scales } from "./layout";

/** Camera ease on entering and leaving: 600 ms. */
export const TILT_MS = 600;
/** World size of the two full planes. */
export const TILT_W = 8;
export const TILT_H = 4.2;
/** The three planes step down and back: microgravity on top, the Moon plane in the middle,
 *  Earth thin at the bottom. */
export const TILT_Y = { micro: 4.7, lunar: 0, earth: -4.2 } as const;
export const TILT_Z = { micro: 0, lunar: -1.4, earth: -2.8 } as const;
/** Earth is a thin reference strip, not a full plane. */
export const EARTH_H = 0.6;
/** The Moon box is a fixed-width marker centred on the band pressure (the band has no width in the data). */
export const MOON_BOX_W = 0.55;
/** Dots are at least 5 px on screen; nearest larger. PointsMaterial size with sizeAttenuation false is pixels. */
export const DOT_PX = 5;
export const NEAR_PX = 10;
const FOV = 38;
const TAN_HALF = Math.tan((FOV / 2) * (Math.PI / 180));

export function easeOutCubic(k: number): number {
  const c = Math.min(1, Math.max(0, k));
  return 1 - Math.pow(1 - c, 3);
}

/** The animation loop's own clock: fraction of the TILT_MS ease elapsed, clamped. Pure. */
export function tiltProgress(from: number, to: number, elapsedMs: number): number {
  return from + (to - from) * Math.min(1, elapsedMs / TILT_MS);
}

export interface Pose {
  pos: [number, number, number];
  look: [number, number, number];
}

/** Camera pose: flat and chart-like at k = 0 (straight at the microgravity plane),
 *  tipped to frame all three planes at k = 1. Pure. Aspect widens the flat distance
 *  so the plane fills narrow frames too. */
export function tiltPose(k: number, aspect = 1.3): Pose {
  const flatDist = Math.max(2.6 / TAN_HALF, 4.3 / (TAN_HALF * aspect));
  const flat: Pose = { pos: [0, TILT_Y.micro, flatDist], look: [0, TILT_Y.micro, TILT_Z.micro] };
  const tipped: Pose = { pos: [0, -5.8, 18.5], look: [0, 1.2, TILT_Z.lunar] };
  const e = easeOutCubic(k);
  const lerp = (a: number, b: number): number => a + (b - a) * e;
  return {
    pos: [lerp(flat.pos[0], tipped.pos[0]), lerp(flat.pos[1], tipped.pos[1]), lerp(flat.pos[2], tipped.pos[2])],
    look: [lerp(flat.look[0], tipped.look[0]), lerp(flat.look[1], tipped.look[1]), lerp(flat.look[2], tipped.look[2])],
  };
}

/** A camera for the pose; no renderer needed, so tests can project with it. */
export function tiltCamera(pose: Pose, aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100);
  camera.position.set(...pose.pos);
  camera.lookAt(...pose.look);
  return camera;
}

export interface TiltPlaneDef {
  corners: [number, number, number][];
  center: [number, number, number];
}

/** World footprint of the three planes, the single source for scene and tests. */
export function tiltPlaneGeometry(): Record<"micro" | "lunar" | "earth", TiltPlaneDef> {
  const def = (y: number, z: number, h: number): TiltPlaneDef => ({
    corners: [
      [-TILT_W / 2, y - h / 2, z],
      [TILT_W / 2, y - h / 2, z],
      [TILT_W / 2, y + h / 2, z],
      [-TILT_W / 2, y + h / 2, z],
    ],
    center: [0, y, z],
  });
  return { micro: def(TILT_Y.micro, TILT_Z.micro, TILT_H), lunar: def(TILT_Y.lunar, TILT_Z.lunar, TILT_H), earth: def(TILT_Y.earth, TILT_Z.earth, EARTH_H) };
}

/** The Analyst lens always gets the 2D SVG chart, never the tilt. */
export function tiltAllowed(lens: Lens, view: StageView): boolean {
  return view === "tilt-lunar" && lens !== "analyst";
}

export type TiltLabelId = "micro" | "lunar" | "earth" | "x" | "y" | "you";
export type TiltFixedLabelId = Exclude<TiltLabelId, "you">;

export interface TiltAnchor {
  group: "micro" | "lunar" | "earth";
  local: [number, number, number];
}

/** Plane-local label anchors, the single source for the scene and the tests. Plane labels sit
 *  at their own plane's top-left corner; the axis titles sit on the front edges (oxygen down
 *  the micro plane's left edge, pressure along the Earth strip's front edge), each with its own
 *  place so no title is drawn over a label. The your-air label has no fixed anchor: it follows
 *  the slider mark. */
export function tiltLabelAnchors(): Record<TiltFixedLabelId, TiltAnchor> {
  return {
    micro: { group: "micro", local: [-TILT_W / 2, TILT_H / 2, 0.05] },
    lunar: { group: "lunar", local: [-TILT_W / 2, TILT_H / 2, 0.05] },
    earth: { group: "earth", local: [-TILT_W / 2, EARTH_H / 2, 0.05] },
    x: { group: "earth", local: [0, -EARTH_H / 2, 0.05] },
    y: { group: "micro", local: [-TILT_W / 2, 0, 0.05] },
  };
}

export interface TiltLabelSpec {
  id: TiltLabelId;
  /** projected frame position of the anchor, in pixels */
  anchor: { x: number; y: number };
  /** measured label size in pixels */
  w: number;
  h: number;
}

export interface TiltLabelBox {
  id: TiltLabelId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Put every tilt label at its own place inside the frame: plane labels above their plane's
 *  top-left corner, the pressure title centred below the Earth strip's front edge, the oxygen
 *  title left of the micro plane's middle, the your-air label centred above its crosshair.
 *  Boxes are clamped into the frame and each label nudges down past the ones before it, so no
 *  box leaves the frame and no two overlap — unless the frame cannot hold them all, when the
 *  last ones stack along the bottom edge (documented, never the case on a story page). Pure. */
export function tiltLabelBoxes(frame: { w: number; h: number }, items: TiltLabelSpec[]): TiltLabelBox[] {
  const order: TiltLabelId[] = ["micro", "lunar", "earth", "x", "y", "you"];
  const byId = new Map(items.map((i) => [i.id, i]));
  const placed: TiltLabelBox[] = [];
  const clashes = (r: TiltLabelBox): boolean =>
    placed.some((p) => r.x < p.x + p.w && p.x < r.x + r.w && r.y < p.y + p.h && p.y < r.y + r.h);
  for (const id of order) {
    const item = byId.get(id);
    if (!item) continue;
    let x: number;
    let y: number;
    if (id === "x") { x = item.anchor.x - item.w / 2; y = item.anchor.y + 4; }
    else if (id === "y") { x = item.anchor.x - item.w - 6; y = item.anchor.y - item.h / 2; }
    else if (id === "you") { x = item.anchor.x - item.w / 2; y = item.anchor.y - item.h - 6; }
    else { x = item.anchor.x; y = item.anchor.y - item.h - 4; }
    x = Math.min(Math.max(x, 0), Math.max(0, frame.w - item.w));
    y = Math.min(Math.max(y, 0), Math.max(0, frame.h - item.h));
    const box: TiltLabelBox = { id, x, y, w: item.w, h: item.h };
    while (clashes(box) && box.y + 4 + box.h <= frame.h) box.y += 4;
    placed.push(box);
  }
  return placed;
}

/** The Moon plane's label is the beat annotation's own words, falling back to the plane label. */
export function lunarLabelFor(
  annotations: NonNullable<StageState["annotation"]>,
  t: (key: string) => string,
  fallback: string,
): string {
  const first = annotations.find((a) => a.at === "lunar-plane");
  return first ? t(first.text_key) : fallback;
}

export type TiltDotFill = "muted" | "near" | "burned";

/** Dot colour exactly as the SVG chart: kept burning is orange, nearest is blue, the rest quiet grey. */
export function dotFill(outcome: Outcome, nearest: boolean): TiltDotFill {
  if (nearest) return "near";
  return OUTCOME_GROUP[outcome] === "burned" ? "burned" : "muted";
}

/** Every dot is at least 5 px on screen; nearest dots draw larger. */
export function dotSizePx(nearest: boolean): number {
  return nearest ? NEAR_PX : DOT_PX;
}

/** Chart pixels to plane-local world units (both full planes share the mapping). */
export function chartToWorld(s: Scales): (px: number, py: number) => [number, number] {
  const w = s.plot.x1 - s.plot.x0;
  const h = s.plot.y1 - s.plot.y0;
  return (px, py) => [((px - s.plot.x0) / w - 0.5) * TILT_W, (0.5 - (py - s.plot.y0) / h) * TILT_H];
}

export interface MoonBox {
  cx: number;
  top: number;
  bottom: number;
  w: number;
}

/** The Moon box rect from the moon.json band (never typed here): centred on the band
 *  pressure, spanning the whole oxygen range. */
export function moonBoxWorld(atm: Atmosphere, s: Scales): MoonBox {
  const toWorld = chartToWorld(s);
  const o2max = atm.o2_pct_max ?? atm.o2_pct_min;
  return {
    cx: toWorld(s.x(atm.pressure_kpa), 0)[0],
    top: toWorld(0, s.y(o2max))[1],
    bottom: toWorld(0, s.y(atm.o2_pct_min))[1],
    w: MOON_BOX_W,
  };
}

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

export interface TiltColors {
  ground: string;
  edge: string;
  muted: string;
  near: string;
  burned: string;
  moon: string;
  ink: string;
}

export interface TiltLabels {
  micro: string;
  lunar: string;
  earth: string;
  x: string;
  y: string;
  you: string;
}

export interface TiltDotsInput {
  /** data values (pressure kPa, oxygen %) to plane-local world units */
  toWorld: (pressure_kpa: number, o2_pct: number) => [number, number];
  box: MoonBox | null;
  /** plane-local world position of the your-air mark, or null when the sliders are not live */
  you: [number, number] | null;
}

export interface TiltScene {
  /** the HTML labels fixed to the planes (positioned by setFrame/setPose) */
  element: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  setDots(placed: PlacedTest[], nearest: Set<string>, input: TiltDotsInput, texts: TiltLabels): void;
  setFrame(w: number, h: number): void;
  setPose(k: number): void;
  dispose(): void;
}

function html<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function planeMesh(w: number, h: number, color: string, opacity: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide }),
  );
  return mesh;
}

function edgeLoop(w: number, h: number, color: string, dashed: boolean): THREE.LineLoop | THREE.Line {
  const pts = [
    new THREE.Vector3(-w / 2, -h / 2, 0),
    new THREE.Vector3(w / 2, -h / 2, 0),
    new THREE.Vector3(w / 2, h / 2, 0),
    new THREE.Vector3(-w / 2, h / 2, 0),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  if (!dashed) return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  const loop = new THREE.LineLoop(
    geo,
    new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.16, transparent: true, opacity: 0.9 }),
  );
  loop.computeLineDistances();
  return loop;
}

/** The scene graph without a renderer: planes, edges and HTML labels persist;
 *  setDots rebuilds the dots, the Moon box and the your-air mark. No WebGL needed. */
export function buildTiltScene(colors: TiltColors, initial: TiltLabels): TiltScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1.3, 0.1, 100);

  const micro = new THREE.Group();
  micro.name = "group-micro";
  micro.position.set(0, TILT_Y.micro, TILT_Z.micro);
  const microPlane = planeMesh(TILT_W, TILT_H, colors.ground, 1);
  microPlane.name = "plane-micro";
  const microEdge = edgeLoop(TILT_W, TILT_H, colors.edge, false);
  microEdge.name = "edge-micro";
  micro.add(microPlane, microEdge);

  const lunar = new THREE.Group();
  lunar.name = "group-lunar";
  lunar.position.set(0, TILT_Y.lunar, TILT_Z.lunar);
  const lunarPlane = planeMesh(TILT_W, TILT_H, colors.edge, 0.08);
  lunarPlane.name = "plane-lunar";
  const lunarEdge = edgeLoop(TILT_W, TILT_H, colors.edge, true);
  lunarEdge.name = "edge-lunar";
  lunar.add(lunarPlane, lunarEdge);

  const earth = new THREE.Group();
  earth.name = "group-earth";
  earth.position.set(0, TILT_Y.earth, TILT_Z.earth);
  const earthPlane = planeMesh(TILT_W, EARTH_H, colors.edge, 0.45);
  earthPlane.name = "plane-earth";
  const earthEdge = edgeLoop(TILT_W, EARTH_H, colors.edge, false);
  earthEdge.name = "edge-earth";
  earth.add(earthPlane, earthEdge);
  scene.add(micro, lunar, earth);

  // plane labels are HTML: readable, localised, and outside the canvas pixels
  const labels = html("div", "tilt-labels");
  const labelEls: Record<"plane-micro" | "plane-lunar" | "plane-earth" | "axis-x" | "axis-y" | "you", HTMLElement> = {
    "plane-micro": html("p", "tilt-label plane-micro", initial.micro),
    "plane-lunar": html("p", "tilt-label plane-lunar", initial.lunar),
    "plane-earth": html("p", "tilt-label plane-earth", initial.earth),
    "axis-x": html("p", "tilt-label axis-x", initial.x),
    "axis-y": html("p", "tilt-label axis-y", initial.y),
    you: html("p", "tilt-label you", initial.you),
  };
  labels.append(...Object.values(labelEls));

  let frame = { w: 0, h: 0 };
  let aspect = 1.3;
  let youAnchor: [number, number, number] | null = null;

  const defs = tiltLabelAnchors();
  labelEls.you.hidden = true;
  // anchors are plane-local; the groups carry the plane offsets
  const groupOf = (group: TiltAnchor["group"]): THREE.Group => (group === "lunar" ? lunar : group === "earth" ? earth : micro);
  const elOf = (id: TiltLabelId): HTMLElement =>
    id === "micro" ? labelEls["plane-micro"] : id === "lunar" ? labelEls["plane-lunar"] : id === "earth" ? labelEls["plane-earth"] : id === "x" ? labelEls["axis-x"] : id === "y" ? labelEls["axis-y"] : labelEls.you;

  // measured label boxes, re-read when the words or the frame change (never mid-ease)
  let sizeKey = "";
  const sizes = new Map<TiltLabelId, { w: number; h: number }>();
  const reposition = (): void => {
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    const key = `${frame.w}x${frame.h}|${labelEls["plane-micro"].textContent}|${labelEls["plane-lunar"].textContent}|${labelEls["plane-earth"].textContent}|${labelEls["axis-x"].textContent}|${labelEls["axis-y"].textContent}|${labelEls.you.textContent}`;
    if (key !== sizeKey) {
      sizeKey = key;
      sizes.clear();
      for (const id of ["micro", "lunar", "earth", "x", "y", "you"] as TiltLabelId[]) {
        const el = elOf(id);
        sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight });
      }
    }
    const v = new THREE.Vector3();
    const project = (group: TiltAnchor["group"], local: [number, number, number]): { x: number; y: number } => {
      v.set(local[0], local[1], local[2]).applyMatrix4(groupOf(group).matrixWorld);
      v.project(camera);
      return { x: (v.x * 0.5 + 0.5) * frame.w, y: (-v.y * 0.5 + 0.5) * frame.h };
    };
    const specs: TiltLabelSpec[] = [];
    for (const [id, def] of Object.entries(defs) as [TiltFixedLabelId, TiltAnchor][]) {
      const size = sizes.get(id) ?? { w: 0, h: 0 };
      specs.push({ id, anchor: project(def.group, def.local), w: size.w, h: size.h });
    }
    if (youAnchor) {
      // the your-air label follows the slider mark, not a fixed anchor
      v.set(youAnchor[0], youAnchor[1], youAnchor[2]).applyMatrix4(micro.matrixWorld);
      v.project(camera);
      const size = sizes.get("you") ?? { w: 0, h: 0 };
      specs.push({ id: "you", anchor: { x: (v.x * 0.5 + 0.5) * frame.w, y: (-v.y * 0.5 + 0.5) * frame.h }, w: size.w, h: size.h });
    } else {
      labelEls.you.hidden = true;
    }
    for (const box of tiltLabelBoxes(frame, specs)) {
      const el = elOf(box.id);
      el.hidden = false;
      el.style.left = `${box.x.toFixed(1)}px`;
      el.style.top = `${box.y.toFixed(1)}px`;
    }
  };

  const clearNamed = (group: THREE.Group, names: string[]): void => {
    for (const name of names) {
      const o = group.getObjectByName(name);
      if (o) {
        group.remove(o);
        o.traverse((c) => {
          const mesh = c as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat) mat.dispose();
        });
      }
    }
  };

  const dotsOf = (fill: TiltDotFill): { mat: THREE.PointsMaterial; pts: number[] } => {
    const color = fill === "near" ? colors.near : fill === "burned" ? colors.burned : colors.muted;
    return {
      mat: new THREE.PointsMaterial({ color, size: dotSizePx(fill === "near"), sizeAttenuation: false, transparent: true, opacity: fill === "muted" ? 0.6 : 1 }),
      pts: [],
    };
  };

  return {
    element: labels,
    scene,
    camera,
    setDots(placed, nearest, input, texts) {
      labelEls["plane-micro"].textContent = texts.micro;
      labelEls["plane-lunar"].textContent = texts.lunar;
      labelEls["plane-earth"].textContent = texts.earth;
      labelEls["axis-x"].textContent = texts.x;
      labelEls["axis-y"].textContent = texts.y;
      labelEls.you.textContent = texts.you;
      clearNamed(micro, ["dots-muted", "dots-burned", "dots-near", "you-mark"]);
      clearNamed(lunar, ["moon-box", "edge-moonbox"]);
      const layers: Record<TiltDotFill, { mat: THREE.PointsMaterial; pts: number[] }> = {
        muted: dotsOf("muted"),
        near: dotsOf("near"),
        burned: dotsOf("burned"),
      };
      for (const p of placed) {
        const [x, y] = input.toWorld(p.pressure_kpa, p.o2_pct);
        layers[dotFill(p.outcome, nearest.has(p.id))].pts.push(x, y, 0.03);
      }
      for (const [name, layer] of Object.entries(layers) as [TiltDotFill, { mat: THREE.PointsMaterial; pts: number[] }][]) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(layer.pts, 3));
        const points = new THREE.Points(geo, layer.mat);
        points.name = `dots-${name}`;
        micro.add(points);
      }
      if (input.box) {
        const h = Math.max(0.15, input.box.top - input.box.bottom);
        const boxMesh = planeMesh(input.box.w, h, colors.moon, 0.35);
        boxMesh.name = "moon-box";
        boxMesh.position.set(input.box.cx, (input.box.top + input.box.bottom) / 2, 0.03);
        const boxEdge = edgeLoop(input.box.w, h, colors.moon, false);
        boxEdge.name = "edge-moonbox";
        boxEdge.position.set(input.box.cx, (input.box.top + input.box.bottom) / 2, 0.03);
        lunar.add(boxMesh, boxEdge);
      }
      youAnchor = null;
      if (input.you) {
        const [x, y] = input.you;
        const arm = 0.45;
        const mark = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x - arm, y, 0.03),
            new THREE.Vector3(x + arm, y, 0.03),
            new THREE.Vector3(x, y - arm, 0.03),
            new THREE.Vector3(x, y + arm, 0.03),
          ]),
          new THREE.LineBasicMaterial({ color: colors.ink }),
        );
        mark.name = "you-mark";
        micro.add(mark);
        youAnchor = [x, y, 0.05];
      }
      reposition();
    },
    setFrame(w, h) {
      if (w <= 0 || h <= 0) return;
      frame = { w, h };
      aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      reposition();
    },
    setPose(k) {
      const pose = tiltPose(k, aspect);
      camera.position.set(...pose.pos);
      camera.lookAt(...pose.look);
      reposition();
    },
    dispose() {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      labels.remove();
    },
  };
}

export interface TiltView {
  element: HTMLElement;
  /** redraw points for the current beat; ids in `nearest` draw larger and blue */
  update(placed: PlacedTest[], nearest: Set<string>, s: Scales, extras: TiltExtras): void;
  /** ease the camera to the tilted view (true) or back to flat (false) */
  setTilted(tilted: boolean): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

export interface TiltExtras {
  refs: RefPlan;
  sliders: { pressure_kpa: number; o2_pct: number } | null;
  microLabel: string;
  lunarLabel: string;
  earthLabel: string;
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
  const view = buildTiltScene(
    {
      ground: cssVar("--space-black", "#1b1b1b"),
      edge: cssVar("--muted-dark", "#dfe1e2"),
      muted: cssVar("--muted-dark", "#dfe1e2"),
      near: cssVar("--data-on-dark", "#2491ff"),
      burned: cssVar("--flame", "#ff5804"),
      moon: cssVar("--moon", "#e7f434"),
      ink: cssVar("--ink-dark", "#ffffff"),
    },
    {
      micro: t("ui.stage.tilt.micro"),
      lunar: t("ui.stage.lunar-plane"),
      earth: t("ui.stage.earth-line"),
      x: t("ui.stage.x-axis"),
      y: t("ui.stage.y-axis"),
      you: t("ui.stage.your-air"),
    },
  );
  container.append(renderer.domElement, view.element);

  let raf = 0;
  let animToken = 0;
  let k = 0;
  let size = { w: 0, h: 0 };
  const applyPose = (): void => {
    view.setPose(k);
    renderer.render(view.scene, view.camera);
  };

  return {
    element: container,
    update(placed, nearest, s, extras) {
      try {
        const toWorld = chartToWorld(s);
        const moonBand = extras.refs.bands.find((b) => b.shape === "moon-box");
        view.setDots(placed, nearest, {
          toWorld: (p, o) => toWorld(s.x(p), s.y(o)),
          box: moonBand ? moonBoxWorld(moonBand.atm, s) : null,
          you: extras.sliders ? toWorld(s.x(extras.sliders.pressure_kpa), s.y(extras.sliders.o2_pct)) : null,
        }, {
          micro: extras.microLabel,
          lunar: extras.lunarLabel,
          earth: extras.earthLabel,
          x: t("ui.stage.x-axis"),
          y: t("ui.stage.y-axis"),
          you: t("ui.stage.your-air"),
        });
        view.setFrame(size.w, size.h);
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
          k = tiltProgress(from, to, performance.now() - start);
          applyPose();
        } catch (e) { fail(e); return; }
        if (k !== to) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    resize(w, h) {
      if (w <= 0 || h <= 0) return;
      size = { w, h };
      try {
        renderer.setSize(w, h, false);
        view.setFrame(w, h);
        applyPose();
      } catch (e) { fail(e); }
    },
    dispose() {
      cancelAnimationFrame(raf);
      animToken++;
      view.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
