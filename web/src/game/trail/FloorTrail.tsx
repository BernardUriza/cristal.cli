import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL, cellCenter, type Maze } from "../maze";
import { useGame } from "../store";
import { cellFigure, cellHue } from "./trail";

const TILE_REACH = CELL * 0.42;
const BIRTH_SECONDS = 0.6;
const FLOOR_LIFT = 0.03;

interface TileProps {
  maze: Maze;
  x: number;
  y: number;
  celebrate: boolean;
}

// One lit cell: nested polygons drawn flat on the floor, turning against each other.
function TrailTile({ maze, x, y, celebrate }: TileProps) {
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const hue = cellHue(x, y, maze.cols);
  const figure = cellFigure(x, y);
  const [wx, wz] = cellCenter(maze, x, y);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.95, 0.6),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [hue]
  );
  const rings = useMemo(
    () =>
      Array.from({ length: figure.rings + 1 }, (_, i) => {
        const outer = TILE_REACH * (1 - i * 0.27);
        return new THREE.RingGeometry(outer - 0.09, outer, i === 0 ? 4 : figure.sides, 1);
      }),
    [figure.rings, figure.sides]
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const now = clock.elapsedTime;
    if (born.current === null) born.current = now;
    const age = Math.min(1, (now - born.current) / BIRTH_SECONDS);
    const pop = 1 + Math.sin(age * Math.PI) * 0.25;
    g.scale.setScalar((0.2 + 0.8 * age) * pop);
    material.opacity = 0.55 + 0.35 * Math.sin(now * 1.3 + hue * 6.28) ** 2;
    if (celebrate) material.color.setHSL((hue + now * 0.12) % 1, 0.95, 0.62);
    g.children.forEach((ring, i) => {
      if (i > 0) ring.rotation.z = now * 0.25 * (i % 2 === 0 ? 1 : -1);
    });
  });

  return (
    <group ref={group} position={[wx, FLOOR_LIFT, wz]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} rotation={[0, 0, i === 0 ? Math.PI / 4 : 0]} />
      ))}
    </group>
  );
}

export function FloorTrail({ maze }: { maze: Maze }) {
  const litCells = useGame((s) => s.litCells);
  const celebrate = litCells.length === maze.cols * maze.rows;
  return (
    <>
      {litCells.map((key) => {
        const [x, y] = key.split(",").map(Number);
        return <TrailTile key={key} maze={maze} x={x} y={y} celebrate={celebrate} />;
      })}
    </>
  );
}
