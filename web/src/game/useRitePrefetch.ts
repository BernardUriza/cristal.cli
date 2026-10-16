import { useEffect } from "react";
import { useGame } from "./store";
import type { WorldNode } from "./worldNodes";

// The rite's map pointer doubles as a prefetch: the AI room takes ~40 s to
// generate, so it starts while the player walks to the suggested glyph.
export function useRitePrefetch(target: WorldNode | null, isRiteTarget: boolean): void {
  const step = useGame((s) => s.verticalSlice.step);
  const prefetch = useGame((s) => s.prefetchGlyphRoom);
  const glyph = isRiteTarget && target?.kind === "glyph" ? target : null;
  const glyphId = glyph?.id ?? null;
  const archetype = glyph?.archetype ?? null;
  useEffect(() => {
    if (step !== "invoke_glyph" || !glyphId || !archetype) return;
    prefetch(archetype, glyphId);
  }, [step, glyphId, archetype, prefetch]);
}
