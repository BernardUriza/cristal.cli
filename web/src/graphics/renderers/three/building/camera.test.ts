import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { dimetricProjector, frontProjector, isometricProjector, militaryProjector, obliqueProjector, perspectiveProjector, planProjector } from "../../../application/projector";
import { composeBuilding } from "../../../application/drawings/index";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../../config/programs";
import { boxCorners } from "../../../domain/math/vec3";
import { cameraFromProjector } from "./camera";
import { buildingToGroup } from "./geometry";

describe("three camera from projector", () => {
  const { building } = composeBuilding(CLOISTER_PROGRAM, CLOISTER_LAYOUT);
  const samples = [...boxCorners(building.bounds), [0, 1.2, 0], [-7.5, 1.1, -7], [3.3, 2.0, 4.0]] as const;
  const projectors = {
    plan: planProjector(building.bounds),
    front: frontProjector(building.bounds),
    isometric: isometricProjector(building.bounds),
    dimetric: dimetricProjector(building.bounds),
    cabinet: obliqueProjector("cabinet", building.bounds),
    military: militaryProjector(building.bounds),
    perspective: perspectiveProjector([30, 12, 30], [0, 2, 0], building.bounds),
  };

  it("projects every sample to the same NDC through three.js and through the TS projector", () => {
    for (const [name, projector] of Object.entries(projectors)) {
      const camera = cameraFromProjector(projector);
      for (const p of samples) {
        const viaThree = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
        const viaTs = projector.toNdc(p);
        expect(viaThree.x, `${name} x`).toBeCloseTo(viaTs[0], 5);
        expect(viaThree.y, `${name} y`).toBeCloseTo(viaTs[1], 5);
        expect(viaThree.z, `${name} z`).toBeCloseTo(viaTs[2], 5);
      }
    }
  });

  it("builds one mesh per solid with the model's own normals", () => {
    const group = buildingToGroup(building);
    const meshes = group.children.filter((c) => c instanceof THREE.Mesh);
    expect(meshes.length).toBe(building.solids.length);
    const first = meshes[0] as THREE.Mesh;
    expect(first.geometry.getAttribute("normal").count).toBe(first.geometry.getAttribute("position").count);
  });
});
