import { useEffect, useMemo, useRef, useState } from "react";
import { CELL, generateMaze } from "../game/maze";
import { distanceField, isFullyConnected } from "../game/mazeGraph";
import { cellKey, nearestUnvisited, routeToRoom } from "../game/MazeRouteAdvisor";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED, SPAWN_CELL } from "../game/mazeConfig";
import { getPlayerPose, subscribePlayerPose, type PlayerPose } from "../game/playerPositionBus";
import { WORLD_NODES, type WorldNode } from "../game/worldNodes";

const CELL_PX = 18;
const STROKE = "#1d4d3a";
const PHOSPHOR = "#39ff14";
const PLAYER = "#7dffd0";
const ROUTE = "#ffcf4d";

const center = (c: number) => c * CELL_PX + CELL_PX / 2;

const OFFSET_X = (MAZE_COLS * CELL) / 2 - CELL / 2;
const OFFSET_Z = (MAZE_ROWS * CELL) / 2 - CELL / 2;

function heat(distance: number, max: number): string {
  if (distance < 0) return "#0a0f0c";
  const t = max > 0 ? distance / max : 0;
  const g = Math.round(40 + (1 - t) * 180);
  const b = Math.round(20 + (1 - t) * 60);
  return `rgb(8, ${g}, ${b})`;
}

export function Minimap() {
  const { maze, dist, maxDist, connected } = useMemo(() => {
    const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
    const dist = distanceField(maze, SPAWN_CELL);
    const maxDist = Math.max(...dist.flat().filter((d) => d >= 0));
    return { maze, dist, maxDist, connected: isFullyConnected(maze) };
  }, []);

  const [pose, setPose] = useState<PlayerPose>(getPlayerPose);
  useEffect(() => subscribePlayerPose(setPose), []);

  const w = MAZE_COLS * CELL_PX;
  const h = MAZE_ROWS * CELL_PX;

  const dotX = ((pose.x + OFFSET_X) / CELL) * CELL_PX + CELL_PX / 2;
  const dotZ = ((pose.z + OFFSET_Z) / CELL) * CELL_PX + CELL_PX / 2;
  const headX = dotX + Math.sin(pose.heading) * CELL_PX * 0.6;
  const headZ = dotZ + Math.cos(pose.heading) * CELL_PX * 0.6;

  // Suggested exploration route: trail visited cells as the player walks, then
  // route to the nearest unvisited world node before falling back to any cell.
  const visited = useRef<Set<string>>(new Set());
  const pcx = Math.max(0, Math.min(MAZE_COLS - 1, Math.round((pose.x + OFFSET_X) / CELL)));
  const pcy = Math.max(0, Math.min(MAZE_ROWS - 1, Math.round((pose.z + OFFSET_Z) / CELL)));
  visited.current.add(cellKey({ x: pcx, y: pcy }));
  const { route, targetNode } = useMemo(() => {
    const from = { x: pcx, y: pcy };
    const nodeRoutes = WORLD_NODES
      .filter((node) => !visited.current.has(cellKey({ x: node.cell[0], y: node.cell[1] })))
      .map((node) => ({
        node,
        route: routeToRoom(maze, from, { x: node.cell[0], y: node.cell[1] }),
      }))
      .filter((entry): entry is { node: WorldNode; route: NonNullable<ReturnType<typeof routeToRoom>> } =>
        Boolean(entry.route)
      )
      .sort((a, b) => a.route.length - b.route.length);
    if (nodeRoutes[0]) return { route: nodeRoutes[0].route, targetNode: nodeRoutes[0].node };

    const target = nearestUnvisited(maze, from, visited.current);
    return { route: target ? routeToRoom(maze, from, target) : null, targetNode: null };
  }, [maze, pcx, pcy]);

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        padding: 8,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${STROKE}`,
        borderRadius: 4,
        font: "10px monospace",
        color: PHOSPHOR,
        pointerEvents: "none",
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges">
        {maze.cells.flatMap((row, y) =>
          row.map((cell, x) => {
            const px = x * CELL_PX;
            const py = y * CELL_PX;
            return (
              <g key={`${x},${y}`}>
                <rect x={px} y={py} width={CELL_PX} height={CELL_PX} fill={heat(dist[y][x], maxDist)} />
                {cell.n && <line x1={px} y1={py} x2={px + CELL_PX} y2={py} stroke={STROKE} />}
                {cell.s && <line x1={px} y1={py + CELL_PX} x2={px + CELL_PX} y2={py + CELL_PX} stroke={STROKE} />}
                {cell.w && <line x1={px} y1={py} x2={px} y2={py + CELL_PX} stroke={STROKE} />}
                {cell.e && <line x1={px + CELL_PX} y1={py} x2={px + CELL_PX} y2={py + CELL_PX} stroke={STROKE} />}
              </g>
            );
          })
        )}
        <circle
          cx={SPAWN_CELL.x * CELL_PX + CELL_PX / 2}
          cy={SPAWN_CELL.y * CELL_PX + CELL_PX / 2}
          r={CELL_PX / 5}
          fill={PHOSPHOR}
          opacity={0.5}
        />
        {route && route.length > 1 && (
          <polyline
            points={route.map((c) => `${center(c.x)},${center(c.y)}`).join(" ")}
            fill="none"
            stroke={ROUTE}
            strokeWidth={2}
            strokeDasharray="3 3"
            opacity={0.85}
          />
        )}
        {route && route.length > 0 && (
          <circle
            cx={center(route[route.length - 1].x)}
            cy={center(route[route.length - 1].y)}
            r={CELL_PX / 4}
            fill="none"
            stroke={ROUTE}
            strokeWidth={1.5}
          />
        )}
        {WORLD_NODES.map((node) => {
          const x = center(node.cell[0]);
          const y = center(node.cell[1]);
          const visitedNode = visited.current.has(cellKey({ x: node.cell[0], y: node.cell[1] }));
          const activeTarget = targetNode?.id === node.id;
          return node.kind === "glyph" ? (
            <rect
              key={node.id}
              x={x - 4}
              y={y - 4}
              width={8}
              height={8}
              fill={node.accent}
              opacity={visitedNode ? 0.4 : 0.95}
              transform={`rotate(45 ${x} ${y})`}
              stroke={activeTarget ? ROUTE : "none"}
              strokeWidth={1.5}
            />
          ) : (
            <rect
              key={node.id}
              x={x - 5}
              y={y - 5}
              width={10}
              height={10}
              fill="none"
              stroke={node.accent}
              strokeWidth={activeTarget ? 2 : 1.3}
              opacity={visitedNode ? 0.45 : 0.95}
            />
          );
        })}
        <line x1={dotX} y1={dotZ} x2={headX} y2={headZ} stroke={PLAYER} strokeWidth={1.5} />
        <circle cx={dotX} cy={dotZ} r={CELL_PX / 3.5} fill={PLAYER} />
      </svg>
      <div style={{ marginTop: 4 }}>
        MAP · {connected ? "connected" : "DISJOINT"} ·{" "}
        {route ? `→ ${targetNode?.label ?? "unexplored"} ${route.length}` : "explored"}
      </div>
    </div>
  );
}
