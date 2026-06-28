import { useGame } from "../game/store";
import { GameMode } from "../game/types";

// HUD analogue of FloatingInteractPrompt.
export function InteractPrompt() {
  const mode = useGame((s) => s.mode);
  const nearby = useGame((s) => s.nearbyConsoleId);

  if (mode !== GameMode.Exploration || !nearby) return null;

  return (
    <div className="prompt">
      <kbd>E</kbd> conectar consola
    </div>
  );
}
