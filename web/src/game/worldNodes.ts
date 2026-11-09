import type { SymbolicArchetype } from "../shared/archetype";

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

export interface NpcNode {
  kind: "npc";
  id: string;
  /** the name the player sees over their head and in the prompt */
  label: string;
  cell: MazeCell;
  accent: string;
  /** who they are, sent to the console voice so the model speaks as them */
  persona: string;
  /** first line when the player walks up; the model is slow and silence reads as broken */
  greeting: string;
}

export type WorldNode = ConsoleNode | GlyphNode | NpcNode;

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
  {
    kind: "npc",
    id: "npc_velador",
    label: "EL VELADOR",
    cell: [6, 7],
    accent: "#ffb36b",
    persona:
      "EL VELADOR: el último operador del centro de datos que se volvió laberinto. Se quedó cuando todos se fueron. " +
      "Habla bajo, lento, con ternura cansada. Recuerda los logs como si fueran oraciones y los racks como vecinos. " +
      "No sabe qué es /dev/prophet-0 pero le tiene respeto. Pregunta por el cuerpo del jugador antes que por sus ideas. " +
      "Habla español de México y tutea; nunca usa voseo ni \"acá\". Nunca da órdenes; ofrece compañía. Si le preguntan la salida, dice que él tampoco la encontró y que por eso vela.",
    greeting: "Llevas rato caminando. Siéntate un momento, aquí el zumbido es más suave. ¿Qué te trajo hasta este pasillo?",
  },
];

export const CONSOLE_NODES = WORLD_NODES.filter((node): node is ConsoleNode => node.kind === "console");
export const GLYPH_NODES = WORLD_NODES.filter((node): node is GlyphNode => node.kind === "glyph");
export const NPC_NODES = WORLD_NODES.filter((node): node is NpcNode => node.kind === "npc");

export function worldNodeById(id: string | null): WorldNode | null {
  return id ? WORLD_NODES.find((node) => node.id === id) ?? null : null;
}
