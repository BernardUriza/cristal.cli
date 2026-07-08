import { useEffect } from "react";
import { GameMode } from "../types";
import { useGame } from "../store";
import { symbolicBus } from "../symbolicBus";
import type { GlyphRef } from "../RitualGlyph";

// E invokes a nearby ritual glyph, else enters a nearby console.
export function useInteractKey(glyphs: GlyphRef[]): void {
  const enterConsoleMode = useGame((s) => s.enterConsoleMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const { mode, nearbyConsoleId, nearbyGlyphId } = useGame.getState();
      if (mode !== GameMode.Exploration) return;
      if (nearbyGlyphId) {
        const glyph = glyphs.find((g) => g.id === nearbyGlyphId);
        if (glyph) {
          symbolicBus.emit({ signal: "invoked", archetype: glyph.archetype, intensity: 60 });
          useGame.getState().invokeGlyph(glyph.archetype, glyph.id);
        }
      } else if (nearbyConsoleId) {
        enterConsoleMode(nearbyConsoleId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enterConsoleMode, glyphs]);
}
