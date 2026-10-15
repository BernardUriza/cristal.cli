import type { SolidKind } from "../domain/architecture/mass.ts";

export type DrawingStyle = {
  paper: string;
  ink: string;
  poche: string;
  cutWidth: number;
  edgeWidth: number;
  fills: Record<SolidKind, string>;
};

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  paper: "#f3e7c6",
  ink: "#1a1412",
  poche: "#1a1412",
  cutWidth: 2.2,
  edgeWidth: 0.8,
  fills: {
    wall: "#f3e7c6",
    lintel: "#f3e7c6",
    sill: "#f3e7c6",
    floor: "#e6d5ab",
    roof: "#ead9b2",
    "tower-roof": "#dfc99a",
  },
};
