import type { SymbolicArchetype } from "./symbolicBus";

export type MazeCell = readonly [number, number];

export interface ConsoleNode {
  kind: "console";
  id: string;
  label: string;
  cell: MazeCell;
  accent: string;
}

export interface GlyphNode {
  kind: "glyph";
  id: string;
  label: string;
  cell: MazeCell;
  archetype: SymbolicArchetype;
  accent: string;
}

export type WorldNode = ConsoleNode | GlyphNode;

export const GLYPH_COLORS: Record<SymbolicArchetype, string> = {
  fragment: "#9bff7d",
  echo: "#7dffd0",
  corruption: "#ff5a3d",
  memory: "#ffd23d",
  moon: "#7db8ff",
  gate: "#b0b0c0",
  vision: "#c879ff",
};

export const WORLD_NODES: readonly WorldNode[] = [
  {
    kind: "console",
    id: "console_alpha",
    label: "ALPHA",
    cell: [3, 2],
    accent: "#33ff99",
  },
  {
    kind: "console",
    id: "console_beta",
    label: "BETA",
    cell: [6, 5],
    accent: "#33ddff",
  },
  {
    kind: "console",
    id: "console_omega",
    label: "OMEGA",
    cell: [1, 7],
    accent: "#ffd23d",
  },
  {
    kind: "glyph",
    id: "glyph_moon",
    label: "LUNA",
    cell: [2, 5],
    archetype: "moon",
    accent: GLYPH_COLORS.moon,
  },
  {
    kind: "glyph",
    id: "glyph_vision",
    label: "VISION",
    cell: [5, 1],
    archetype: "vision",
    accent: GLYPH_COLORS.vision,
  },
  {
    kind: "glyph",
    id: "glyph_corruption",
    label: "ROTURA",
    cell: [7, 3],
    archetype: "corruption",
    accent: GLYPH_COLORS.corruption,
  },
];

export const CONSOLE_NODES = WORLD_NODES.filter((node): node is ConsoleNode => node.kind === "console");
export const GLYPH_NODES = WORLD_NODES.filter((node): node is GlyphNode => node.kind === "glyph");

export function worldNodeById(id: string | null): WorldNode | null {
  return id ? WORLD_NODES.find((node) => node.id === id) ?? null : null;
}
