export type Palette = {
  bg: string;
  wall: string;
  ink: string;
  primary: string;
  secondary: string;
  accent: string;
  gold: string;
  floorA: string;
  floorB: string;
  deep: string;
};

export const PALETTES = {
  friedeberg: {
    bg: "#f3e7c6",
    wall: "#e6d5ab",
    ink: "#1a1412",
    primary: "#b8336a",
    secondary: "#2f8f86",
    accent: "#dfa23d",
    gold: "#c89a2a",
    floorA: "#1a1412",
    floorB: "#f3e7c6",
    deep: "#2a2f6b",
  },
  noche: {
    bg: "#0b0b12",
    wall: "#16162a",
    ink: "#f1e6c8",
    primary: "#d8468f",
    secondary: "#2fb7c9",
    accent: "#e6bf55",
    gold: "#e0b24a",
    floorA: "#0b0b12",
    floorB: "#33ff99",
    deep: "#000000",
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];
