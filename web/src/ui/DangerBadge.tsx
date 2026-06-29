import { useGame } from "../game/store";
import { profileRoomDanger, type RoomAction } from "../game/RoomDangerProfiler";

const ACTION_COLOR: Record<RoomAction, string> = {
  "exit-now": "#ff3b3b",
  avoid: "#ff8a3d",
  rush: "#ffcf4d",
  explore: "#39ff14",
};

export function DangerBadge() {
  const room = useGame((s) => s.room);
  const stability = useGame((s) => s.stability);
  const history = useGame((s) => s.roomHistory);
  if (!room) return null;

  const { dangerScore, tags, recommendedAction } = profileRoomDanger(room, stability, history);
  const color = ACTION_COLOR[recommendedAction];

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        top: 56,
        padding: "6px 10px",
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${color}`,
        borderRadius: 4,
        font: "11px monospace",
        color,
        pointerEvents: "none",
      }}
    >
      <div style={{ fontWeight: 700 }}>
        DANGER {dangerScore} · {recommendedAction.toUpperCase()}
      </div>
      {tags.length > 0 && <div style={{ opacity: 0.8, marginTop: 2 }}>{tags.join(" · ")}</div>}
    </div>
  );
}
