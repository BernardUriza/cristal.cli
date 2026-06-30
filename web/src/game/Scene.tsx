import { useMemo } from "react";
import * as THREE from "three";
import { Labyrinth } from "./Labyrinth";
import { InWorldConsole } from "./InWorldConsole";
import { Player, type ConsoleRef } from "./Player";
import { RitualGlyph, type GlyphRef } from "./RitualGlyph";
import { BackroomFurniture } from "./BackroomFurniture.tsx";
import { placeBackroomFurniture } from "./BackroomFurniturePlacer";
import { cellCenter, generateMaze } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED, SPAWN_CELL } from "./mazeConfig";
import { CONSOLE_NODES, GLYPH_NODES, WORLD_NODES } from "./worldNodes";

export function Scene() {
  const maze = useMemo(() => generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED), []);

  const spawn = useMemo<[number, number, number]>(() => {
    // central cell so the follow camera starts inside the labyrinth
    const [x, z] = cellCenter(maze, MAZE_COLS >> 1, MAZE_ROWS >> 1);
    return [x, 0, z];
  }, [maze]);

  const consoles = useMemo<ConsoleRef[]>(
    () =>
      CONSOLE_NODES.map((c) => {
        const [x, z] = cellCenter(maze, c.cell[0], c.cell[1]);
        return { id: c.id, label: c.label, position: new THREE.Vector3(x, 0, z) };
      }),
    [maze]
  );

  const glyphs = useMemo<GlyphRef[]>(
    () =>
      GLYPH_NODES.map((g) => {
        const [x, z] = cellCenter(maze, g.cell[0], g.cell[1]);
        return { id: g.id, position: new THREE.Vector3(x, 0, z), archetype: g.archetype };
      }),
    [maze]
  );

  const furniture = useMemo(
    () =>
      placeBackroomFurniture(maze, MAZE_SEED, [
        SPAWN_CELL,
        ...WORLD_NODES.map((node) => ({ x: node.cell[0], y: node.cell[1] })),
      ]),
    [maze]
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

      {CONSOLE_NODES.map((c) => {
        const [x, z] = cellCenter(maze, c.cell[0], c.cell[1]);
        return (
          <InWorldConsole
            key={c.id}
            id={c.id}
            label={c.label}
            accent={c.accent}
            position={[x, 0, z]}
          />
        );
      })}

      {GLYPH_NODES.map((g) => {
        const [x, z] = cellCenter(maze, g.cell[0], g.cell[1]);
        return (
          <RitualGlyph
            key={g.id}
            id={g.id}
            position={[x, 0, z]}
            archetype={g.archetype}
            color={g.accent}
          />
        );
      })}

      {furniture.map((item) => (
        <BackroomFurniture
          key={item.id}
          kind={item.kind}
          position={item.position}
          rotationY={item.rotationY}
        />
      ))}

      <Player maze={maze} spawn={spawn} consoles={consoles} glyphs={glyphs} />
    </>
  );
}
