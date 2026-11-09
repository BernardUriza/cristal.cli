import { useGame } from "../game/store";
import { MAZE_COLS, MAZE_ROWS } from "../game/mazeConfig";

const TOTAL = MAZE_COLS * MAZE_ROWS;

// How much of the labyrinth the player has lit. A count, never a clock.
export function TrailMeter() {
  const lit = useGame((s) => s.litCells.length);
  if (lit === 0) return null;
  const complete = lit === TOTAL;
  return (
    <div className={`trail-meter${complete ? " complete" : ""}`} role="status">
      {complete ? "el laberinto está encendido" : `◆ ${lit} / ${TOTAL} encendidas`}
    </div>
  );
}
