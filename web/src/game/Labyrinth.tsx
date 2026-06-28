import { useMemo } from "react";
import * as THREE from "three";
import { CELL, WALL_HEIGHT, WALL_THICK, cellCenter, type Maze } from "./maze";

interface LabyrinthProps {
  maze: Maze;
}

interface WallSpec {
  position: [number, number, number];
  size: [number, number, number];
}

// Builds wall box specs from the maze cell graph. Only N/W walls are emitted
// per cell (plus the far S/E border) to avoid double-walling shared edges.
function buildWalls(maze: Maze): WallSpec[] {
  const walls: WallSpec[] = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const cell = maze.cells[y][x];
      const [cx, cz] = cellCenter(maze, x, y);
      if (cell.n) {
        walls.push({
          position: [cx, WALL_HEIGHT / 2, cz - CELL / 2],
          size: [CELL + WALL_THICK, WALL_HEIGHT, WALL_THICK],
        });
      }
      if (cell.w) {
        walls.push({
          position: [cx - CELL / 2, WALL_HEIGHT / 2, cz],
          size: [WALL_THICK, WALL_HEIGHT, CELL + WALL_THICK],
        });
      }
      if (y === maze.rows - 1 && cell.s) {
        walls.push({
          position: [cx, WALL_HEIGHT / 2, cz + CELL / 2],
          size: [CELL + WALL_THICK, WALL_HEIGHT, WALL_THICK],
        });
      }
      if (x === maze.cols - 1 && cell.e) {
        walls.push({
          position: [cx + CELL / 2, WALL_HEIGHT / 2, cz],
          size: [WALL_THICK, WALL_HEIGHT, CELL + WALL_THICK],
        });
      }
    }
  }
  return walls;
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
