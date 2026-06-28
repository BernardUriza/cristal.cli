import { useMemo } from "react";
import * as THREE from "three";
import { Labyrinth } from "./Labyrinth";
import { InWorldConsole } from "./InWorldConsole";
import { Player, type ConsoleRef } from "./Player";
import { RitualGlyph, type GlyphRef } from "./RitualGlyph";
import { cellCenter, generateMaze } from "./maze";
import type { SymbolicArchetype } from "./symbolicBus";

const MAZE_COLS = 8;
const MAZE_ROWS = 8;
const MAZE_SEED = 1337;

const GLYPH_COLORS: Record<SymbolicArchetype, string> = {
  fragment: "#9bff7d",
  echo: "#7dffd0",
  corruption: "#ff5a3d",
  memory: "#ffd23d",
  moon: "#7db8ff",
  gate: "#b0b0c0",
  vision: "#c879ff",
};

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

  // Ritual glyphs — invocations of the corrupted liturgy, one archetype each.
  const glyphPlacements = useMemo(
    () => [
      { id: "glyph_moon", cell: [2, 5] as const, archetype: "moon" as SymbolicArchetype },
      { id: "glyph_vision", cell: [5, 1] as const, archetype: "vision" as SymbolicArchetype },
      { id: "glyph_corruption", cell: [7, 3] as const, archetype: "corruption" as SymbolicArchetype },
    ],
    []
  );

  const glyphs = useMemo<GlyphRef[]>(
    () =>
      glyphPlacements.map((g) => {
        const [x, z] = cellCenter(maze, g.cell[0], g.cell[1]);
        return { id: g.id, position: new THREE.Vector3(x, 0, z), archetype: g.archetype };
      }),
    [maze, glyphPlacements]
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

      {glyphPlacements.map((g) => {
        const [x, z] = cellCenter(maze, g.cell[0], g.cell[1]);
        return (
          <RitualGlyph
            key={g.id}
            id={g.id}
            position={[x, 0, z]}
            archetype={g.archetype}
            color={GLYPH_COLORS[g.archetype]}
          />
        );
      })}

      <Player maze={maze} spawn={spawn} consoles={consoles} glyphs={glyphs} />
    </>
  );
}
