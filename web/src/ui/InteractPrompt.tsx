import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { worldNodeById } from "../game/worldNodes";

// HUD analogue of FloatingInteractPrompt.
export function InteractPrompt() {
  const mode = useGame((s) => s.mode);
  const nearbyConsole = useGame((s) => s.nearbyConsoleId);
  const nearbyGlyph = useGame((s) => s.nearbyGlyphId);
  const node = worldNodeById(nearbyGlyph ?? nearbyConsole);

  if (mode !== GameMode.Exploration) return null;
  if (nearbyGlyph) {
    return (
      <div className="prompt">
        <kbd>E</kbd> invocar {node?.label ?? "glifo"}
      </div>
    );
  }
  if (nearbyConsole) {
    return (
      <div className="prompt">
        <kbd>E</kbd> conectar {node?.label ?? "consola"}
      </div>
    );
  }
  return null;
}
