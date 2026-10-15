export type ShaftScheme =
  | { kind: "banded"; bands: number; flutes: number; dottedChevrons: boolean }
  | { kind: "helix"; turns: number };

export type Capital = { voluteLevel: number; rosette: boolean };

export type Column = { x: number; z: number; h: number; r: number; shaft: ShaftScheme; capital: Capital };

export type Arch = {
  x0: number;
  x1: number;
  z: number;
  y: number;
  r: number;
  pointed: boolean;
  gallery: number[];
  voussoirs: number;
  galleryVoussoirs: number;
  nestedRings: number;
  ribs: number;
  detailLevel: number;
};

export type Window = { x: number; z: number; y: number; r: number; star: boolean; mullion: boolean };

export type Entablature = { y: number; h: number; triglyphs: number; flipped: number; rosetteLevel: number };

export type Dome = { x: number; y: number; r: number; ribs: number; tiers: number; windows: number; detailLevel: number };

export type Colonnade = {
  z: number;
  depth: number;
  floorY: number;
  halfWidth: number;
  fanRays: number;
  columns: Column[];
  arches: Arch[];
  windows: Window[];
  entablature: Entablature;
  dome: Dome | null;
};

export type Floor = { tile: number; xMin: number; xMax: number; zMin: number; zMax: number; diamonds: boolean; discs: boolean };

export type Platform = { halfWidth: number; z: number; depth: number; steps: number; stepHeight: number };

export type Sky = { sun: { u: number; v: number; rays: number; fractalDepth: number }; stars: number };

export type Architecture = { floor: Floor; platform: Platform; main: Colonnade; wings: Colonnade[]; sky: Sky };
