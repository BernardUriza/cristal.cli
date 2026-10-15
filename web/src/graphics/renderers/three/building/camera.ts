import * as THREE from "three";
import type { Projector } from "../../../application/projector.ts";

/** A camera whose matrices ARE the projector's: `Vector3.project(camera)` equals `projector.toNdc`. */
export function cameraFromProjector(projector: Projector): THREE.Camera {
  const camera = new THREE.Camera();
  camera.matrixAutoUpdate = false;
  camera.projectionMatrix.fromArray(projector.proj);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.matrixWorldInverse.fromArray(projector.view);
  camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
  camera.matrix.copy(camera.matrixWorld);
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
  return camera;
}

/** Re-applies a projector onto an existing camera (after a resize or a view switch). */
export function applyProjector(camera: THREE.Camera, projector: Projector): void {
  camera.matrixAutoUpdate = false;
  camera.projectionMatrix.fromArray(projector.proj);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.matrixWorldInverse.fromArray(projector.view);
  camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
  camera.matrix.copy(camera.matrixWorld);
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
}
