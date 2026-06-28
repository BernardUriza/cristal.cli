import { useGame } from "../game/store";

export function DebugHUD() {
  const locomotion = useGame((s) => s.locomotion);
  const mode = useGame((s) => s.mode);
  const lastSymbol = useGame((s) => s.lastSymbol);
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
    </div>
  );
}
