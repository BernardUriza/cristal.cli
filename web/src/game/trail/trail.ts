// The floor remembers where the player has stepped: each cell lights in its own
// colour and sounds its own note, so walking the labyrinth paints and plays it.

const PENTATONIC = [0, 2, 4, 7, 9] as const;
const ROOT_HZ = 196;
const GOLDEN_TURN = 0.61803398875;

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** semitones above the root; neighbours are always consonant, far cells climb an octave */
export function cellSemitone(x: number, y: number): number {
  const degree = PENTATONIC[(x + y * 2) % PENTATONIC.length];
  const octave = Math.floor((x + y) / 6);
  return degree + octave * 12;
}

export function cellFrequency(x: number, y: number): number {
  return ROOT_HZ * 2 ** (cellSemitone(x, y) / 12);
}

/** 0..1 hue; the golden turn keeps adjacent cells far apart on the wheel */
export function cellHue(x: number, y: number, cols: number): number {
  return ((y * cols + x) * GOLDEN_TURN) % 1;
}

/** how many concentric figures the tile draws, and with how many sides */
export function cellFigure(x: number, y: number): { rings: number; sides: number } {
  return { rings: 1 + ((x + y) % 3), sides: [4, 6, 8, 12][(x * 3 + y) % 4] };
}

export function lightCell(lit: readonly string[], x: number, y: number): readonly string[] {
  const key = cellKey(x, y);
  return lit.includes(key) ? lit : [...lit, key];
}
