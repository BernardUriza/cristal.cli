import * as THREE from "three";
import type { Building, Solid, SolidKind } from "../../../domain/architecture/mass.ts";

export type BuildingColors = Record<SolidKind, string>;

export const DEFAULT_BUILDING_COLORS: BuildingColors = {
  wall: "#e6d5ab",
  lintel: "#e6d5ab",
  sill: "#e6d5ab",
  floor: "#c9b887",
  roof: "#d6c196",
  "tower-roof": "#b8336a",
};

/** Fan-triangulates each convex face; flat normals come straight from the model, never recomputed. */
export function solidToGeometry(solid: Solid): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const face of solid.faces) {
    for (let i = 1; i + 1 < face.points.length; i++) {
      for (const p of [face.points[0], face.points[i], face.points[i + 1]]) {
        positions.push(p[0], p[1], p[2]);
        normals.push(face.normal[0], face.normal[1], face.normal[2]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

export function buildingToGroup(building: Building, colors: BuildingColors = DEFAULT_BUILDING_COLORS, edgeColor = "#1a1412"): THREE.Group {
  const group = new THREE.Group();
  group.name = `building:${building.plan.programId}`;
  const materials = new Map<SolidKind, THREE.MeshStandardMaterial>();
  const edgeMaterial = new THREE.LineBasicMaterial({ color: edgeColor });
  for (const solid of building.solids) {
    const kind = solid.tag.kind;
    if (!materials.has(kind)) materials.set(kind, new THREE.MeshStandardMaterial({ color: colors[kind], roughness: 0.9, metalness: 0 }));
    const geometry = solidToGeometry(solid);
    const mesh = new THREE.Mesh(geometry, materials.get(kind)!);
    mesh.name = solid.id;
    mesh.userData = solid.tag;
    group.add(mesh);
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), edgeMaterial));
  }
  return group;
}
