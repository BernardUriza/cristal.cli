import { useGame } from "../game/store";
import { RoomMemoryIndex } from "../game/RoomMemoryIndex";
import { profileRoomDanger } from "../game/RoomDangerProfiler";

const PHOSPHOR = "#39ff14";

export function RoomJournal() {
  const history = useGame((s) => s.roomHistory);
  if (history.length === 0) return null;

  const index = new RoomMemoryIndex();
  history.forEach((room, i) => {
    const { dangerScore, tags } = profileRoomDanger(room, 100, history.slice(0, i));
    index.addRoom({ room, dangerScore, tags });
  });

  const recent = index.recent(5);
  const worst = index.mostDangerous(1)[0];

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        maxWidth: 220,
        padding: 8,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid #1d4d3a`,
        borderRadius: 4,
        font: "10px monospace",
        color: PHOSPHOR,
        pointerEvents: "none",
      }}
    >
      <div style={{ opacity: 0.7 }}>JOURNAL · {index.summarizeTrail()}</div>
      {recent.map((r) => (
        <div key={r.room.seed} style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {worst && r.room.seed === worst.room.seed ? "☠ " : "· "}
          {r.room.name} <span style={{ opacity: 0.6 }}>({r.dangerScore})</span>
        </div>
      ))}
    </div>
  );
}
