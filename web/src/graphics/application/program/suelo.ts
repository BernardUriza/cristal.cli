import type { PlacedSpace } from "../../domain/grammar/layout.ts";
import type { SpaceKind } from "../../domain/grammar/types.ts";
import type { Footing } from "../patio/sitio.ts";
import { freeRects } from "./andenes.ts";
import type { ProgramScene } from "./scene.ts";

const MIN_WALK = 2;

const WALKS: Partial<Record<SpaceKind, string>> = {
  street: "calle",
  junction: "cruce",
  "street-ring": "anillo de calles",
  plaza: "plaza",
  "ring-gallery": "anillo",
  platform: "terraza",
  courtyard: "patio",
};

const area = (f: Footing) => (f.rect.x1 - f.rect.x0) * (f.rect.z1 - f.rect.z0);

function openPart(s: ProgramScene, p: PlacedSpace, label: string): Footing[] {
  const held = s.layout.spaces.filter((q) => q.node.parent === p.node.id).map((q) => q.rect);
  return freeRects(p.rect, held, MIN_WALK).map((rect) => ({ rect, y: p.y1, label }));
}

/** The ground a crowd walks: the open part of every street, crossing, plaza, ring and terrace; with none of those, the platforms of the precinct left between its masses. */
export function walksOfProgram(s: ProgramScene): Footing[] {
  const root = s.layout.spaces.find((p) => !p.node.parent)!;
  const named = s.layout.spaces.flatMap((p) => (WALKS[p.node.kind] ? openPart(s, p, WALKS[p.node.kind]!) : []));
  const walks = named.length ? named : openPart(s, root, "andén");
  return walks.sort((a, b) => area(b) - area(a));
}
