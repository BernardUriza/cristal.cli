import { useGame } from "../game/store";
import { GameMode } from "../game/types";

// HUD analogue of FloatingInteractPrompt.
export function InteractPrompt() {
  const mode = useGame((s) => s.mode);
  const nearbyConsole = useGame((s) => s.nearbyConsoleId);
  const nearbyGlyph = useGame((s) => s.nearbyGlyphId);

  if (mode !== GameMode.Exploration) return null;
  if (nearbyGlyph) {
    return (
      <div className="prompt">
        <kbd>E</kbd> invocar glifo
      </div>
    );
  }
  if (nearbyConsole) {
    return (
      <div className="prompt">
        <kbd>E</kbd> conectar consola
      </div>
    );
  }
  return null;
}
