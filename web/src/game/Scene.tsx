import { useMemo } from "react";
import * as THREE from "three";
import { Labyrinth } from "./Labyrinth";
import { InWorldConsole } from "./InWorldConsole";
import { Npc } from "./Npc";
import { Player, type ConsoleRef } from "./Player";
import { RitualGlyph, type GlyphRef } from "./RitualGlyph";
import { WallInscription } from "./WallInscription";
import { FloorTrail } from "./trail/FloorTrail";
import { dawnLevel } from "./trail/trail";
import { BackroomFurnitureSet } from "./BackroomFurniture.tsx";
import { placeBackroomFurniture } from "./BackroomFurniturePlacer";
import { furnitureSolids } from "./furnitureSolids";
import { cellCenter, generateMaze } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED, SPAWN_CELL } from "./mazeConfig";
import { CONSOLE_NODES, GLYPH_NODES, NPC_NODES, WORLD_NODES } from "./worldNodes";
import { useGame } from "./store";
import { rewardLevel, viajeAtmosphere } from "./viaje";
import { Temple } from "../graphics/presentation/Temple";
import { GAME_COMPOSITION, TEMPLE_PLACEMENT } from "../graphics/config/composition";

const SOLID_RADIUS = 0.55;

export function Scene() {
  const maze = useMemo(() => generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED), []);
  const transference = useGame((s) => s.transference);
  const inscriptions = useGame((s) => s.inscriptions);
  const viaje = useGame((s) => s.viaje);
  const atmosphere = viajeAtmosphere(viaje ? rewardLevel(inscriptions.length) : 0);
  // The more floor the player lights, the further the dark retreats: progress you can see.
  const dawn = useGame((s) => dawnLevel(s.litCells.length, MAZE_COLS * MAZE_ROWS));
  const omittedIds = useMemo(
    () => new Set(transference.absencePlan.omissions.map((item) => item.id)),
    [transference.absencePlan]
  );
  const visibleConsoles = useMemo(
    () => CONSOLE_NODES.filter((node) => !omittedIds.has(node.id)),
    [omittedIds]
  );
  const visibleGlyphs = useMemo(
    () => GLYPH_NODES.filter((node) => !omittedIds.has(node.id)),
    [omittedIds]
  );

  const spawn = useMemo<[number, number, number]>(() => {
    // central cell so the follow camera starts inside the labyrinth
    const [x, z] = cellCenter(maze, MAZE_COLS >> 1, MAZE_ROWS >> 1);
    return [x, 0, z];
  }, [maze]);

  // Inhabitants ride the console pipeline (proximity, E, camera framing) so the
  // player approaches and addresses them exactly like a console.
  const consoles = useMemo<ConsoleRef[]>(
    () =>
      [...visibleConsoles, ...NPC_NODES].map((c) => {
        const [x, z] = cellCenter(maze, c.cell[0], c.cell[1]);
        return { id: c.id, label: c.label, position: new THREE.Vector3(x, 0, z) };
      }),
    [maze, visibleConsoles]
  );

  const glyphs = useMemo<GlyphRef[]>(
    () =>
      visibleGlyphs.map((g) => {
        const [x, z] = cellCenter(maze, g.cell[0], g.cell[1]);
        return { id: g.id, position: new THREE.Vector3(x, 0, z), archetype: g.archetype };
      }),
    [maze, visibleGlyphs]
  );

  const furniture = useMemo(
    () =>
      placeBackroomFurniture(maze, MAZE_SEED, [
        SPAWN_CELL,
        ...WORLD_NODES.map((node) => ({ x: node.cell[0], y: node.cell[1] })),
      ]),
    [maze]
  );

  const solids = useMemo(
    () => [
      ...consoles.map((c) => ({ x: c.position.x, z: c.position.z, radius: SOLID_RADIUS })),
      ...furnitureSolids(maze, furniture),
    ],
    [consoles, furniture, maze]
  );

  return (
    <>
      <color attach="background" args={["#02050a"]} />
      <fog attach="fog" args={["#02050a", 8, atmosphere.fogFar + dawn * 40]} />

      <ambientLight intensity={atmosphere.ambient * (1 + dawn * 2.2)} color="#2a5a44" />
      <hemisphereLight args={["#1a4a32", "#04100a", atmosphere.hemisphere * (1 + dawn * 1.5)]} />
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
      <FloorTrail maze={maze} />
      <Temple input={GAME_COMPOSITION} position={TEMPLE_PLACEMENT.position} rotation={TEMPLE_PLACEMENT.rotation} viewDistance={TEMPLE_PLACEMENT.viewDistance} />

      {visibleConsoles.map((c) => {
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

      {NPC_NODES.map((n) => {
        const [x, z] = cellCenter(maze, n.cell[0], n.cell[1]);
        return <Npc key={n.id} id={n.id} label={n.label} accent={n.accent} position={[x, 0, z]} />;
      })}

      {visibleGlyphs.map((g) => {
        const [x, z] = cellCenter(maze, g.cell[0], g.cell[1]);
        const gravity = transference.ritualGravity.archetypeBias[g.archetype] ?? 1;
        return (
          <RitualGlyph
            key={g.id}
            id={g.id}
            position={[x, 0, z]}
            archetype={g.archetype}
            color={g.accent}
            gravity={gravity}
          />
        );
      })}

      {inscriptions.map((item) => (
        <WallInscription key={item.id} maze={maze} inscription={item} />
      ))}

      <BackroomFurnitureSet items={furniture} />

      <Player maze={maze} spawn={spawn} consoles={consoles} glyphs={glyphs} solids={solids} />
    </>
  );
}
