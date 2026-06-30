import { useEffect, useMemo } from "react";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { deriveRoomD1Results } from "../game/RoomD1Derivations";
import { shouldOfferSafeExit } from "../game/RuntimeTransference";

// In-room HUD: the prophet's caption, breadcrumb, stability gauge, and the
// cross/exit prompts. Crossing is proximity-only (walk to a door + E); ESC
// leaves.
export function RoomCaption() {
  const room = useGame((s) => s.room);
  const mode = useGame((s) => s.mode);
  const nearbyExit = useGame((s) => s.nearbyExit);
  const depth = useGame((s) => s.depth);
  const parentSeed = useGame((s) => s.parentSeed);
  const history = useGame((s) => s.roomHistory);
  const stability = useGame((s) => s.stability);
  const dangerousSeeds = useGame((s) => s.dangerousSeeds);
  const whisper = useGame((s) => s.lastRoomWhisper);
  const pressure = useGame((s) => s.psychologicalPressure);
  const stance = useGame((s) => s.psychologicalStance);
  const pressureEnding = useGame((s) => s.pressureEnding);
  const emotionalHistory = useGame((s) => s.emotionalHistory);
  const falseDoorCount = useGame((s) => s.falseDoorAnnotations.length);
  const transference = useGame((s) => s.transference);
  const dismissRoom = useGame((s) => s.dismissRoom);

  const inRoom = mode === GameMode.Room && !!room;
  const { safeExit, mirrors } = useMemo(() => {
    const d1 = deriveRoomD1Results({
        room,
        psychologicalStance: stance,
        psychologicalPressure: pressure,
        emotionalHistory,
        falseDoorCount,
      });
    return {
      safeExit: room && shouldOfferSafeExit(room, d1.safeExit, transference.worldBehavior) ? d1.safeExit : null,
      mirrors: d1.mirrors,
    };
  }, [room, stance, pressure, emotionalHistory, falseDoorCount, transference.worldBehavior]);

  useEffect(() => {
    if (!inRoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") dismissRoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inRoom, dismissRoom]);

  if (!inRoom || !room) return null;

  const exitText =
    nearbyExit !== null
      ? nearbyExit === safeExit?.index
        ? safeExit.label
        : room.exits[nearbyExit]
      : null;
  const dread = Math.max(0, Math.min(100, room.dread));
  const stab = Math.max(0, Math.min(100, stability));
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const danger = new Set(dangerousSeeds);
  const here = danger.has(room.seed);
  const trail = history.slice(0, -1).slice(-4);
  const echo = transference.memoryEchoes[0]?.text;
  const omitSentence = transference.absencePlan.omissions.some((item) => item.kind === "sentence");

  return (
    <div className={`room-caption${here ? " room-caption-danger" : ""}`}>
      <p className="room-breadcrumb">
        <span>{transference.identity.identity.toLowerCase()} · prof {depth}</span>
        <span>seed {hex(room.seed)}</span>
        <span>{parentSeed !== null ? `desde ${hex(parentSeed)}` : "raíz"}</span>
        {here && <span className="room-danger-tag">⚠ peligroso</span>}
      </p>
      <h2 className="room-name">{mirrors?.softenedRoomName ?? room.name}</h2>
      {!omitSentence && <p className="room-inscription">“{room.inscription}”</p>}
      <div className="room-dread">
        <span>DREAD</span>
        <span className="room-dread-bar">
          <span style={{ width: `${dread}%` }} />
        </span>
        <span>{room.dread}</span>
      </div>
      <div className="room-dread room-stability">
        <span>INTEGRIDAD</span>
        <span className="room-dread-bar">
          <span
            className={stab < 30 ? "room-stability-low" : undefined}
            style={{ width: `${stab}%` }}
          />
        </span>
        <span>{Math.round(stab)}</span>
      </div>
      {trail.length > 0 && (
        <p className="room-trail">
          {trail.map((r) => (danger.has(r.seed) ? `⚠${r.name}` : r.name)).join(" → ")} →{" "}
          <em>{room.name}</em>
        </p>
      )}
      {pressureEnding?.active ? (
        <p className="room-trail room-whisper">{pressureEnding.line}</p>
      ) : (
        whisper && <p className="room-trail room-whisper">{whisper}</p>
      )}
      {!pressureEnding?.active && !whisper && echo && <p className="room-trail room-whisper">{echo}</p>}
      {!pressureEnding?.active && transference.narrativeReflection && (
        <p className="room-trail room-whisper">{transference.narrativeReflection}</p>
      )}
      <p className="room-caption-hint">
        {exitText
          ? `[E] cruzar — ${exitText}`
          : "camina hasta una puerta para cruzar · [ESC] salir"}
      </p>
    </div>
  );
}
