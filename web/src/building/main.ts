import "../shared/tokens.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { composeSheets, DEFAULT_SECTION } from "../graphics/application/drawings/index.ts";
import { frontProjector, isometricProjector, planProjector, rightProjector, type Projector } from "../graphics/application/projector.ts";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../graphics/config/programs.ts";
import { pairKey } from "../graphics/domain/architecture/program.ts";
import { applyProjector } from "../graphics/renderers/three/building/camera.ts";
import { buildingToGroup } from "../graphics/renderers/three/building/geometry.ts";
import { toSvg } from "../graphics/renderers/svg/serialize.ts";

const DOOR = pairKey("sala-n1", "gal-n");
type ViewName = "orbit" | "plan" | "front" | "section" | "isometric";

const sheetsEl = document.getElementById("sheets")!;
const threeEl = document.getElementById("three")!;
const doorInput = document.getElementById("door") as HTMLInputElement;
const doorValue = document.getElementById("door-value")!;
const reportEl = document.getElementById("report")!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.localClippingEnabled = true;
threeEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0b12");
scene.add(new THREE.HemisphereLight("#fff6dd", "#2a2f6b", 1.1));
const sun = new THREE.DirectionalLight("#ffffff", 1.4);
sun.position.set(20, 30, 10);
scene.add(sun);

const orbitCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
orbitCamera.position.set(28, 18, 30);
const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.target.set(0, 2, 0);
const fixedCamera = new THREE.Camera();
let view: ViewName = "orbit";
let group: THREE.Group | null = null;
let projectors: Record<Exclude<ViewName, "orbit">, Projector> | null = null;
const sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), DEFAULT_SECTION.at);

function rebuild(doorAt: number): void {
  const layout = { ...CLOISTER_LAYOUT, openingOverrides: { [DOOR]: { at: doorAt } } };
  const { building, report, sheets } = composeSheets(CLOISTER_PROGRAM, layout);
  sheetsEl.replaceChildren(
    ...sheets.map((sheet) => {
      const fig = document.createElement("figure");
      const cap = document.createElement("figcaption");
      cap.textContent = sheet.title;
      fig.innerHTML = toSvg(sheet.list, sheet.projector.viewport.width, sheet.projector.viewport.height);
      fig.prepend(cap);
      return fig;
    }),
  );
  if (group) scene.remove(group);
  group = buildingToGroup(building);
  scene.add(group);
  const vp = { width: threeEl.clientWidth || 1, height: threeEl.clientHeight || 1, margin: 0.08 };
  projectors = {
    plan: planProjector(building.bounds, vp),
    front: frontProjector(building.bounds, vp),
    section: rightProjector(building.bounds, vp),
    isometric: isometricProjector(building.bounds, vp),
  };
  const errors = [...report.geometric, ...report.architectural].filter((i) => i.level === "error");
  reportEl.textContent = errors.length ? `✗ ${errors.map((e) => e.code).join(", ")}` : `✓ geometría y arquitectura válidas · estructura: ${report.structural.status}`;
  reportEl.classList.toggle("bad", errors.length > 0);
  applyView();
}

function applyView(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>("button[data-view]")) b.classList.toggle("active", b.dataset.view === view);
  controls.enabled = view === "orbit";
  renderer.clippingPlanes = view === "section" ? [sectionPlane] : [];
  if (view !== "orbit" && projectors) applyProjector(fixedCamera, projectors[view]);
}

function resize(): void {
  const w = threeEl.clientWidth || 1;
  const h = threeEl.clientHeight || 1;
  renderer.setSize(w, h, false);
  orbitCamera.aspect = w / h;
  orbitCamera.updateProjectionMatrix();
  if (group) rebuild(Number(doorInput.value));
}

doorInput.addEventListener("input", () => {
  doorValue.textContent = Number(doorInput.value).toFixed(2);
  rebuild(Number(doorInput.value));
});
for (const b of document.querySelectorAll<HTMLButtonElement>("button[data-view]")) {
  b.addEventListener("click", () => {
    view = b.dataset.view as ViewName;
    applyView();
  });
}
window.addEventListener("resize", resize);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, view === "orbit" ? orbitCamera : fixedCamera);
});
resize();
rebuild(Number(doorInput.value));
