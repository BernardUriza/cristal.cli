import { useEffect } from "react";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";

// In-room HUD: the prophet's caption plus the cross/exit prompts. Owns the
// keyboard for crossing doors (E near a door, or number keys) and leaving (ESC).
export function RoomCaption() {
  const room = useGame((s) => s.room);
  const mode = useGame((s) => s.mode);
  const nearbyExit = useGame((s) => s.nearbyExit);
  const depth = useGame((s) => s.depth);
  const parentSeed = useGame((s) => s.parentSeed);
  const history = useGame((s) => s.roomHistory);
  const takeExit = useGame((s) => s.takeExit);
  const dismissRoom = useGame((s) => s.dismissRoom);

  const inRoom = mode === GameMode.Room && !!room;

  useEffect(() => {
    if (!inRoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        dismissRoom();
        return;
      }
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit) {
        const idx = Number(digit[1]) - 1;
        if (room && idx < room.exits.length) takeExit(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inRoom, room, takeExit, dismissRoom]);

  if (!inRoom || !room) return null;

  const exitText = nearbyExit !== null ? room.exits[nearbyExit] : null;
  const dread = Math.max(0, Math.min(100, room.dread));
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const trail = history.slice(0, -1).slice(-4);

  return (
    <div className="room-caption">
      <p className="room-breadcrumb">
        <span>prof {depth}</span>
        <span>seed {hex(room.seed)}</span>
        <span>{parentSeed !== null ? `desde ${hex(parentSeed)}` : "raíz"}</span>
      </p>
      <h2 className="room-name">{room.name}</h2>
      <p className="room-inscription">“{room.inscription}”</p>
      <div className="room-dread">
        <span>DREAD</span>
        <span className="room-dread-bar">
          <span style={{ width: `${dread}%` }} />
        </span>
        <span>{room.dread}</span>
      </div>
      {trail.length > 0 && (
        <p className="room-trail">
          {trail.map((r) => r.name).join(" → ")} → <em>{room.name}</em>
        </p>
      )}
      <p className="room-caption-hint">
        {exitText
          ? `[E] cruzar — ${exitText}`
          : "camina hacia una puerta · [1-9] cruzar · [ESC] salir"}
      </p>
    </div>
  );
}
