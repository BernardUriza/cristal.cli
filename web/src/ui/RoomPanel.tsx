import { useEffect } from "react";
import { useGame } from "../game/store";

export function RoomPanel() {
  const room = useGame((s) => s.room);
  const loading = useGame((s) => s.roomLoading);
  const error = useGame((s) => s.roomError);
  const dismissRoom = useGame((s) => s.dismissRoom);

  useEffect(() => {
    if (!room && !error) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyQ") dismissRoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [room, error, dismissRoom]);

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
          <ul className="room-exits">
            {room.exits.map((exit, i) => (
              <li key={i}>&gt; {exit}</li>
            ))}
          </ul>
          <div className="room-dread">
            <span>DREAD</span>
            <span className="room-dread-bar">
              <span style={{ width: `${Math.max(0, Math.min(100, room.dread))}%` }} />
            </span>
            <span>{room.dread}</span>
          </div>
          <p className="room-dismiss">[ESC] disolver</p>
        </div>
      )}
    </div>
  );
}
