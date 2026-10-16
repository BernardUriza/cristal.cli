import type { SliceStep, VerticalSliceState } from "./VerticalSlice";
import { worldNodeById, type WorldNode } from "./worldNodes";

export type RiteTargetKind = "console" | "glyph";

const STEP_INDEX: Record<SliceStep, number> = {
  open_console: 1,
  confess: 2,
  invoke_glyph: 3,
  cross_room: 4,
  return_changed: 5,
  complete: 5,
};

export function riteTargetKind(step: SliceStep): RiteTargetKind {
  return step === "open_console" || step === "confess" ? "console" : "glyph";
}

// Which world nodes the exploration route should aim at for the current rite
// step: consoles until the confession lands, glyphs afterwards. A closed run
// points at the glyphs not yet invoked so the next variation reads on the map.
export function riteCandidateNodes(
  slice: VerticalSliceState,
  nodes: readonly WorldNode[]
): WorldNode[] {
  const kind = riteTargetKind(slice.step);
  const candidates = nodes.filter((node) => node.kind === kind);
  if (slice.step === "complete" && slice.invokedGlyph) {
    const fresh = candidates.filter((node) => node.id !== slice.invokedGlyph);
    if (fresh.length > 0) return fresh;
  }
  return candidates;
}

const FRAGMENT_COMPACT_LENGTH = 24;

function compactFragment(fragment: string): string {
  return fragment.length > FRAGMENT_COMPACT_LENGTH
    ? `${fragment.slice(0, FRAGMENT_COMPACT_LENGTH - 1)}…`
    : fragment;
}

// One-line digest of the rite so the journal, the route and the objective panel
// speak the same language: step position, archived phrase, answering glyph and
// any false doors that already bit.
export function riteSummaryLine(slice: VerticalSliceState): string {
  const parts: string[] = [
    slice.step === "complete"
      ? `RITO ✓ · runs ${slice.completedRuns}`
      : `RITO ${STEP_INDEX[slice.step]}/5`,
  ];
  if (slice.confessionFragment) parts.push(`«${compactFragment(slice.confessionFragment)}»`);
  if (slice.invokedGlyph) {
    parts.push(worldNodeById(slice.invokedGlyph)?.label ?? slice.invokedGlyph.toUpperCase());
  }
  if (slice.falseDoors > 0) parts.push(`⚠ ${slice.falseDoors} falsas`);
  return parts.join(" · ");
}
