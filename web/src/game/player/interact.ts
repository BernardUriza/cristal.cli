import { GameMode } from "../types";
import { useGame } from "../store";
import { symbolicBus } from "../symbolicBus";
import { worldNodeById } from "../worldNodes";

/** Acts on whatever the player is standing next to: a glyph first, else a console or inhabitant. */
export function interactWithNearby(): boolean {
  const { mode, activeConsoleId, nearbyConsoleId, nearbyGlyphId, invokeGlyph, enterConsoleMode } = useGame.getState();
  const walking = mode === GameMode.Exploration || (mode === GameMode.Transition && activeConsoleId === null);
  if (!walking) return false;
  const glyph = worldNodeById(nearbyGlyphId);
  if (glyph?.kind === "glyph") {
    symbolicBus.emit({ signal: "invoked", archetype: glyph.archetype, intensity: 60 });
    invokeGlyph(glyph.archetype, glyph.id);
    return true;
  }
  if (!nearbyConsoleId) return false;
  enterConsoleMode(nearbyConsoleId);
  return true;
}
