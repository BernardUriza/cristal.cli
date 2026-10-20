export type SpaceKind = "room" | "gallery" | "courtyard" | "tower" | "vestibule" | "exterior";

export type AccessKind = "door" | "arch" | "open";

export type SpaceSpec = { id: string; kind: SpaceKind; label: string };

export type AdjacencySpec = { a: string; b: string; access: AccessKind };

export type Program = {
  id: string;
  spaces: SpaceSpec[];
  adjacencies: AdjacencySpec[];
  entrance: AdjacencySpec;
};

export const EXTERIOR = "exterior";

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
