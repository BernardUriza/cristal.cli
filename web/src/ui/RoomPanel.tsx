import { useGame } from "../game/store";
import { roomErrorLine, roomLoadingLine } from "./promptCopy";

// While a room is being rewritten the player is still in the maze, so this stays
// a lightweight overlay: the loading liturgy and any generation error. The room
// itself is the 3D RoomScene; its caption lives in RoomCaption.
export function RoomPanel() {
  const loading = useGame((s) => s.roomLoading);
  const error = useGame((s) => s.roomError);
  const archetype = useGame((s) => s.roomArchetype);
  const dismissRoom = useGame((s) => s.dismissRoom);

  if (!loading && !error) return null;

  return (
    <div className="room-panel" role="status" aria-live="polite">
      {loading && (
        <p className="room-loading">
          {roomLoadingLine(archetype)}
          <span className="room-cursor">_</span>
        </p>
      )}

      {error && !loading && (
        <>
          <p className="room-error">{roomErrorLine(error)}</p>
          <button type="button" className="room-door" onClick={dismissRoom}>
            <span className="room-door-key">↩</span>
            <span className="room-door-label">volver al laberinto</span>
          </button>
        </>
      )}
    </div>
  );
}
