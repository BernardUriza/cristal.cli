// Single source of truth for the labyrinth dimensions/seed so the 3D Scene and
// the 2D minimap regenerate the exact same maze instead of duplicating literals.
export const MAZE_COLS = 8;
export const MAZE_ROWS = 8;
export const MAZE_SEED = 1337;

// The player spawns in the central cell (see Scene spawn); the minimap shades
// reachability distance from here.
export const SPAWN_CELL = { x: MAZE_COLS >> 1, y: MAZE_ROWS >> 1 };
