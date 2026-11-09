import { useMemo } from "react";
import * as THREE from "three";
import { CELL, type Maze } from "./maze";
import { buildWalls } from "./mazeWalls";

interface LabyrinthProps {
  maze: Maze;
}

export function Labyrinth({ maze }: LabyrinthProps) {
  const walls = useMemo(() => buildWalls(maze), [maze]);
  const floorW = maze.cols * CELL;
  const floorH = maze.rows * CELL;

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0d1a14",
        emissive: "#04130c",
        roughness: 0.85,
        metalness: 0.05,
      }),
    []
  );
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#070b09",
        roughness: 0.95,
        metalness: 0.0,
      }),
    []
  );

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={floorMat}
      >
        <planeGeometry args={[floorW, floorH]} />
      </mesh>

      {walls.map((w, i) => (
        <mesh key={i} position={w.position} material={wallMat} castShadow receiveShadow>
          <boxGeometry args={w.size} />
        </mesh>
      ))}
    </group>
  );
}
