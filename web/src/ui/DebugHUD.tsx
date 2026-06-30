import { useGame } from "../game/store";
import { worldNodeById } from "../game/worldNodes";

export function DebugHUD() {
  const locomotion = useGame((s) => s.locomotion);
  const mode = useGame((s) => s.mode);
  const lastSymbol = useGame((s) => s.lastSymbol);
  const activeConsoleId = useGame((s) => s.activeConsoleId);
  const nearbyConsoleId = useGame((s) => s.nearbyConsoleId);
  const nearbyGlyphId = useGame((s) => s.nearbyGlyphId);
  const node = worldNodeById(nearbyGlyphId ?? activeConsoleId ?? nearbyConsoleId);

  return (
    <div className="debug-hud">
      <span className={`loco-${locomotion}`}>
        loco: <b>{locomotion}</b>
      </span>
      <span>
        mode: <b>{mode.toLowerCase()}</b>
      </span>
      <span>
        sym:{" "}
        <b>
          {lastSymbol ? `${lastSymbol.archetype}·${lastSymbol.signal}` : "—"}
        </b>
      </span>
      <span>
        node: <b>{node?.label ?? "—"}</b>
      </span>
    </div>
  );
}
