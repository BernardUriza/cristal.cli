import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { worldNodeById } from "../game/worldNodes";
import { promptForNode } from "./promptCopy";

// HUD analogue of FloatingInteractPrompt.
export function InteractPrompt() {
  const mode = useGame((s) => s.mode);
  const nearbyConsole = useGame((s) => s.nearbyConsoleId);
  const nearbyGlyph = useGame((s) => s.nearbyGlyphId);
  const step = useGame((s) => s.verticalSlice.step);
  const node = worldNodeById(nearbyGlyph ?? nearbyConsole);

  if (mode !== GameMode.Exploration || !node) return null;

  const copy = promptForNode(node, step);
  return (
    <div className="prompt" style={{ borderColor: copy.accent }} role="status">
      <div className="prompt-action">
        <kbd>E</kbd> {copy.action}
      </div>
      {copy.hint && <div className="prompt-hint">{copy.hint}</div>}
    </div>
  );
}
