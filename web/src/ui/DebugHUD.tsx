import { useGame } from "../game/store";

export function DebugHUD() {
  const locomotion = useGame((s) => s.locomotion);
  const mode = useGame((s) => s.mode);
  return (
    <div className="debug-hud">
      <span className={`loco-${locomotion}`}>
        loco: <b>{locomotion}</b>
      </span>
      <span>
        mode: <b>{mode.toLowerCase()}</b>
      </span>
    </div>
  );
}
