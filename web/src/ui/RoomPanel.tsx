import { useEffect } from "react";
import { useGame } from "../game/store";

export function RoomPanel() {
  const room = useGame((s) => s.room);
  const loading = useGame((s) => s.roomLoading);
  const error = useGame((s) => s.roomError);
  const dismissRoom = useGame((s) => s.dismissRoom);
  const takeExit = useGame((s) => s.takeExit);

  useEffect(() => {
    if (!room && !error) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyQ") {
        dismissRoom();
        return;
      }
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit && room && !loading) {
        const idx = Number(digit[1]) - 1;
        if (idx < room.exits.length) takeExit(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [room, error, loading, dismissRoom, takeExit]);

  if (!loading && !room && !error) return null;

  return (
    <div className="room-panel">
      {loading && (
        <p className="room-loading">
          /dev/prophet-0 reescribiendo el cuarto<span className="room-cursor">_</span>
        </p>
      )}

      {error && !loading && (
        <p className="room-error">la liturgia falló: {error}</p>
      )}

      {room && !loading && (
        <div className="room-body">
          <h2 className="room-name">{room.name}</h2>
          <p className="room-inscription">“{room.inscription}”</p>
          <p className="room-desc">{room.description}</p>
          {room.exits.length > 0 ? (
            <ul className="room-doors">
              {room.exits.map((exit, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="room-door"
                    onClick={() => takeExit(i)}
                  >
                    <span className="room-door-key">{i + 1}</span>
                    <span className="room-door-frame">⌷</span>
                    <span className="room-door-label">{exit}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="room-noexit">el cuarto se cierra. no hay salida.</p>
          )}
          <div className="room-dread">
            <span>DREAD</span>
            <span className="room-dread-bar">
              <span style={{ width: `${Math.max(0, Math.min(100, room.dread))}%` }} />
            </span>
            <span>{room.dread}</span>
          </div>
          <p className="room-dismiss">
            [1-{Math.max(1, room.exits.length)}] cruzar puerta · [ESC] disolver
          </p>
        </div>
      )}
    </div>
  );
}
