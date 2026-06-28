import { useMemo } from "react";
import * as THREE from "three";
import { Labyrinth } from "./Labyrinth";
import { InWorldConsole } from "./InWorldConsole";
import { Player, type ConsoleRef } from "./Player";
import { cellCenter, generateMaze } from "./maze";

const MAZE_COLS = 8;
const MAZE_ROWS = 8;
const MAZE_SEED = 1337;

export function Scene() {
  const maze = useMemo(() => generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED), []);

  const spawn = useMemo<[number, number, number]>(() => {
    // central cell so the follow camera starts inside the labyrinth
    const [x, z] = cellCenter(maze, MAZE_COLS >> 1, MAZE_ROWS >> 1);
    return [x, 0, z];
  }, [maze]);

  // A few consoles scattered through the labyrinth.
  const consolePlacements = useMemo(
    () => [
      { id: "console_alpha", cell: [3, 2] as const },
      { id: "console_beta", cell: [6, 5] as const },
      { id: "console_omega", cell: [1, 7] as const },
    ],
    []
  );

  const consoles = useMemo<ConsoleRef[]>(
    () =>
      consolePlacements.map((c) => {
        const [x, z] = cellCenter(maze, c.cell[0], c.cell[1]);
        return { id: c.id, position: new THREE.Vector3(x, 0, z) };
      }),
    [maze, consolePlacements]
  );

  return (
    <>
      <color attach="background" args={["#02050a"]} />
      <fog attach="fog" args={["#02050a", 8, 34]} />

      <ambientLight intensity={0.6} color="#2a5a44" />
      <hemisphereLight args={["#1a4a32", "#04100a", 0.8]} />
      <directionalLight
        position={[10, 18, 6]}
        intensity={1.1}
        color="#aef5d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <Labyrinth maze={maze} />

      {consolePlacements.map((c) => {
        const [x, z] = cellCenter(maze, c.cell[0], c.cell[1]);
        return <InWorldConsole key={c.id} id={c.id} position={[x, 0, z]} />;
      })}

      <Player maze={maze} spawn={spawn} consoles={consoles} />
    </>
  );
}
