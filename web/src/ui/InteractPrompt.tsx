import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { interactWithNearby } from "../game/player/interact";
import { worldNodeById } from "../game/worldNodes";
import { promptForNode } from "./promptCopy";

// HUD analogue of FloatingInteractPrompt. The whole card is the button: E, Enter or a click.
export function InteractPrompt() {
  const mode = useGame((s) => s.mode);
  const nearbyConsole = useGame((s) => s.nearbyConsoleId);
  const nearbyGlyph = useGame((s) => s.nearbyGlyphId);
  const step = useGame((s) => s.verticalSlice.step);
  const node = worldNodeById(nearbyGlyph ?? nearbyConsole);

  if (mode !== GameMode.Exploration || !node) return null;

  const copy = promptForNode(node, step);
  return (
    <button type="button" className="prompt" style={{ borderColor: copy.accent }} onClick={interactWithNearby}>
      {copy.said && (
        <span className="prompt-said" style={{ color: copy.accent }}>
          «{copy.said}»
        </span>
      )}
      <span className="prompt-action">
        <kbd>E</kbd> {copy.action}
      </span>
      {copy.hint && <span className="prompt-hint">{copy.hint}</span>}
    </button>
  );
}
