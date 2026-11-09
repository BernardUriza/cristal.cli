import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CELL, type Maze } from "./maze";
import { buildWalls } from "./mazeWalls";

interface LabyrinthProps {
  maze: Maze;
  /** 0..1: how much of the floor the player has lit; the walls glow out of the dark with it */
  dawn?: number;
}

const WALL_NIGHT = new THREE.Color("#04130c");
const WALL_DAWN = new THREE.Color("#1a5a42");
const FLOOR_NIGHT = new THREE.Color("#000000");
const FLOOR_DAWN = new THREE.Color("#061710");

export function Labyrinth({ maze, dawn = 0 }: LabyrinthProps) {
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

  // The wall material is nearly black, so extra fill light barely shows; its own glow is what reads.
  useEffect(() => {
    wallMat.emissive.lerpColors(WALL_NIGHT, WALL_DAWN, dawn);
    floorMat.emissive.lerpColors(FLOOR_NIGHT, FLOOR_DAWN, dawn);
  }, [dawn, wallMat, floorMat]);

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
