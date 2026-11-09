import { useGame } from "../store";
import { cellFrequency, cellKey } from "./trail";
import { playChord, playStepNote } from "./stepNote";

const FRESH_LEVEL = 0.55;
const REVISIT_LEVEL = 0.18;
const FINALE = [196, 246.94, 293.66, 392, 493.88, 587.33, 784];

/** The player's feet reached a cell: light it if it was dark, and let it sound either way. */
export function stepOnCell(x: number, y: number, totalCells: number): void {
  const before = useGame.getState().litCells;
  const fresh = !before.includes(cellKey(x, y));
  if (fresh) useGame.getState().lightCell(x, y);
  playStepNote(cellFrequency(x, y), fresh ? FRESH_LEVEL : REVISIT_LEVEL);
  if (fresh && before.length + 1 === totalCells) window.setTimeout(() => playChord(FINALE, 0.5), 500);
}
