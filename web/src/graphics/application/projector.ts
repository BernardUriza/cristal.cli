import { boxCorners, type Box3, type Vec3, boxCenter, add, scale, sub, normalize, length } from "../domain/math/vec3.ts";
import { lookAt, multiply, orthographic, perspective, shear, transformPoint, type Mat4 } from "../domain/math/mat4.ts";
import type { Vec2 } from "../domain/shapes.ts";

export type ProjectorKind =
  | "plan"
  | "front"
  | "back"
  | "left"
  | "right"
  | "isometric"
  | "dimetric"
  | "cavalier"
  | "cabinet"
  | "military"
  | "perspective";

export type Viewport = { width: number; height: number; margin: number };

export type Projector = {
  kind: ProjectorKind;
  view: Mat4;
  proj: Mat4;
  viewProj: Mat4;
  viewport: Viewport;
  toNdc: (p: Vec3) => Vec3;
  toScreen: (p: Vec3) => Vec2;
  pxPerMeter: number;
  eye: Vec3;
  forward: Vec3;
};

export const DEFAULT_VIEWPORT: Viewport = { width: 1200, height: 900, margin: 0.08 };

const ISO_ELEVATION = Math.asin(1 / Math.sqrt(3));
const DIMETRIC_DIRECTION: Vec3 = [1 / 3, 1 / 3, Math.sqrt(7) / 3];

function ndcToScreen(ndc: Vec3, vp: Viewport): Vec2 {
  return [((ndc[0] + 1) / 2) * vp.width, ((1 - ndc[1]) / 2) * vp.height];
}

function fitOrthographic(view: Mat4, content: readonly Vec3[], vp: Viewport): { proj: Mat4; pxPerMeter: number } {
  const pts = content.map((c) => transformPoint(view, c));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
  }
  const usableW = vp.width * (1 - 2 * vp.margin);
  const usableH = vp.height * (1 - 2 * vp.margin);
  const pxPerMeter = Math.min(usableW / Math.max(maxX - minX, 1e-9), usableH / Math.max(maxY - minY, 1e-9));
  const halfW = vp.width / 2 / pxPerMeter;
  const halfH = vp.height / 2 / pxPerMeter;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const pad = Math.max(1, (maxZ - minZ) * 0.05);
  const near = -maxZ - pad;
  const far = -minZ + pad;
  return { proj: orthographic(cx - halfW, cx + halfW, cy - halfH, cy + halfH, near, far), pxPerMeter };
}

function finish(kind: ProjectorKind, view: Mat4, proj: Mat4, vp: Viewport, pxPerMeter: number, eye: Vec3, forward: Vec3): Projector {
  const viewProj = multiply(proj, view);
  const toNdc = (p: Vec3) => transformPoint(viewProj, p);
  return { kind, view, proj, viewProj, viewport: vp, toNdc, toScreen: (p) => ndcToScreen(toNdc(p), vp), pxPerMeter, eye, forward };
}

function orthoFromDirection(kind: ProjectorKind, direction: Vec3, up: Vec3, frame: Box3, vp: Viewport, extraShear?: Mat4, content: readonly Vec3[] = boxCorners(frame)): Projector {
  const center = boxCenter(frame);
  const dist = length(sub(frame.max, frame.min)) * 2 + 10;
  const eye = add(center, scale(normalize(direction), dist));
  const base = lookAt(eye, center, up);
  const view = extraShear ? multiply(extraShear, base) : base;
  const { proj, pxPerMeter } = fitOrthographic(view, content, vp);
  return finish(kind, view, proj, vp, pxPerMeter, eye, normalize(sub(center, eye)));
}

/** Looks straight down −Y; north (−Z) ends up at the top of the sheet. */
export function planProjector(frame: Box3, vp = DEFAULT_VIEWPORT): Projector {
  return orthoFromDirection("plan", [0, 1, 0], [0, 0, -1], frame, vp);
}

/** Main elevation: the observer stands south (+Z) looking north. */
export function frontProjector(frame: Box3, vp = DEFAULT_VIEWPORT): Projector {
  return orthoFromDirection("front", [0, 0, 1], [0, 1, 0], frame, vp);
}

export function backProjector(frame: Box3, vp = DEFAULT_VIEWPORT): Projector {
  return orthoFromDirection("back", [0, 0, -1], [0, 1, 0], frame, vp);
}

export function leftProjector(frame: Box3, vp = DEFAULT_VIEWPORT): Projector {
  return orthoFromDirection("left", [-1, 0, 0], [0, 1, 0], frame, vp);
}

export function rightProjector(frame: Box3, vp = DEFAULT_VIEWPORT): Projector {
  return orthoFromDirection("right", [1, 0, 0], [0, 1, 0], frame, vp);
}

/** True isometric: elevation asin(1/√3) = 35.264°, azimuth 45°, every axis foreshortened by √(2/3); `content` fits the projected hull of those points instead of the frame's corners. */
export function isometricProjector(frame: Box3, vp = DEFAULT_VIEWPORT, azimuth = Math.PI / 4, content?: readonly Vec3[]): Projector {
  const dir: Vec3 = [Math.cos(ISO_ELEVATION) * Math.sin(azimuth), Math.sin(ISO_ELEVATION), Math.cos(ISO_ELEVATION) * Math.cos(azimuth)];
  return orthoFromDirection("isometric", dir, [0, 1, 0], frame, vp, undefined, content);
}

/** Engineering dimetric (ISO 5456-3 style): axes near 7° and 42°, foreshortening 1 : 1 : ½. */
export function dimetricProjector(frame: Box3, vp = DEFAULT_VIEWPORT): Projector {
  const [a, b, c] = DIMETRIC_DIRECTION;
  return orthoFromDirection("dimetric", [c, a, b], [0, 1, 0], frame, vp);
}

/** Oblique: front face true, depth sheared at `angle` with factor `depthScale` (cavalier 1, cabinet ½). */
export function obliqueProjector(kind: "cavalier" | "cabinet", frame: Box3, vp = DEFAULT_VIEWPORT, angle = Math.PI / 4, depthScale = kind === "cavalier" ? 1 : 0.5): Projector {
  const s = shear(0, 0, 0, 0, -depthScale * Math.cos(angle), -depthScale * Math.sin(angle));
  return orthoFromDirection(kind, [0, 0, 1], [0, 1, 0], frame, vp, s);
}

/** Military / planometric: the plan keeps its true shape, rotated by `rotation`; heights rise at full scale. */
export function militaryProjector(frame: Box3, vp = DEFAULT_VIEWPORT, rotation = Math.PI / 4, heightScale = 1): Projector {
  const s = shear(0, 0, 0, 0, 0, heightScale);
  const up: Vec3 = [-Math.sin(rotation), 0, -Math.cos(rotation)];
  return orthoFromDirection("military", [0, 1, 0], up, frame, vp, s);
}

export function perspectiveProjector(eye: Vec3, target: Vec3, frame: Box3, vp = DEFAULT_VIEWPORT, fovY = Math.PI / 3): Projector {
  const view = lookAt(eye, target, [0, 1, 0]);
  const pts = boxCorners(frame).map((c) => transformPoint(view, c));
  const depths = pts.map((p) => -p[2]);
  const near = Math.max(0.1, Math.min(...depths) * 0.5);
  const far = Math.max(...depths) * 2 + 10;
  const proj = perspective(fovY, vp.width / vp.height, near, far);
  const focalPx = vp.height / 2 / Math.tan(fovY / 2);
  const distance = length(sub(target, eye));
  return finish("perspective", view, proj, vp, focalPx / distance, eye, normalize(sub(target, eye)));
}
