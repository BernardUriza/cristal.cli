export type FurnitureMount = "floor" | "wall" | "ceiling";

export interface FurnitureFootprint {
  widthCells: number;
  depthCells: number;
}

export interface BackroomFurnitureDefinition {
  id: string;
  label: string;
  kind: string;
  footprint: FurnitureFootprint;
  mount: FurnitureMount;
  accent: string;
  emissive?: boolean;
}

export const BACKROOM_FURNITURE = [
  {
    id: "fluorescent_ceiling_light",
    label: "Fluorescent ceiling light",
    kind: "fluorescent_ceiling_light",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "ceiling",
    accent: "#d8ffe3",
    emissive: true,
  },
  {
    id: "office_desk",
    label: "Office desk",
    kind: "office_desk",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#6f6657",
  },
  {
    id: "office_chair",
    label: "Office chair",
    kind: "office_chair",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#2f3635",
  },
  {
    id: "filing_cabinet",
    label: "Filing cabinet",
    kind: "filing_cabinet",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#8b938b",
  },
  {
    id: "stacked_cardboard_boxes",
    label: "Stacked cardboard boxes",
    kind: "stacked_cardboard_boxes",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#9a7650",
  },
  {
    id: "server_rack",
    label: "Server rack",
    kind: "server_rack",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#46e6a1",
    emissive: true,
  },
  {
    id: "fire_extinguisher",
    label: "Fire extinguisher",
    kind: "fire_extinguisher",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "wall",
    accent: "#d92820",
  },
  {
    id: "exit_sign",
    label: "Exit sign",
    kind: "exit_sign",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "wall",
    accent: "#49ff87",
    emissive: true,
  },
  {
    id: "floor_vent",
    label: "Floor vent",
    kind: "floor_vent",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#59625d",
  },
  {
    id: "exposed_pipes",
    label: "Exposed pipes",
    kind: "exposed_pipes",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "ceiling",
    accent: "#78827b",
  },
  {
    id: "vending_machine",
    label: "Vending machine",
    kind: "vending_machine",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#c94b5f",
    emissive: true,
  },
  {
    id: "wet_carpet_patch",
    label: "Wet carpet patch",
    kind: "wet_carpet_patch",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#173f35",
  },
  {
    id: "broken_monitor",
    label: "Broken monitor",
    kind: "broken_monitor",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#7df0ff",
    emissive: true,
  },
  {
    id: "rolling_cart",
    label: "Rolling utility cart",
    kind: "rolling_cart",
    footprint: { widthCells: 1, depthCells: 1 },
    mount: "floor",
    accent: "#7d8581",
  },
] as const satisfies readonly BackroomFurnitureDefinition[];

export type BackroomFurnitureKind = (typeof BACKROOM_FURNITURE)[number]["kind"];

export const BACKROOM_FURNITURE_KINDS = BACKROOM_FURNITURE.map((item) => item.kind) as readonly BackroomFurnitureKind[];

export function backroomFurnitureByKind(kind: BackroomFurnitureKind) {
  return BACKROOM_FURNITURE.find((item) => item.kind === kind)!;
}
