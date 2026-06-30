import { useGame } from "../game/store";
import { RoomMemoryIndex } from "../game/RoomMemoryIndex";
import { profileRoomDanger } from "../game/RoomDangerProfiler";
import { parseInscription } from "../game/InscriptionParser";
import { summarizeEmotionalHistory } from "../game/EmotionalHistory";
import { buildAdaptiveWorldProfile } from "../game/AdaptiveWorldProfile";

const PHOSPHOR = "#39ff14";

export function RoomJournal() {
  const history = useGame((s) => s.roomHistory);
  const emotionalHistory = useGame((s) => s.emotionalHistory);
  const falseDoorCount = useGame((s) => s.falseDoorAnnotations.length);
  const depth = useGame((s) => s.depth);
  const transference = useGame((s) => s.transference);
  if (history.length === 0) return null;

  const index = new RoomMemoryIndex();
  history.forEach((room, i) => {
    const { dangerScore, tags } = profileRoomDanger(room, 100, history.slice(0, i));
    const { mood, symbols } = parseInscription(room.inscription);
    const enriched = [...tags, ...(mood !== "neutral" ? [mood] : []), ...symbols];
    index.addRoom({ room, dangerScore, tags: enriched });
  });

  const recent = index.recent(5);
  const worst = index.mostDangerous(1)[0];
  const emotional = summarizeEmotionalHistory(emotionalHistory);
  const profile = buildAdaptiveWorldProfile({
    emotionalHistory,
    falseDoorCount,
    roomDepths: history.map((_, i) => Math.max(0, depth - history.length + i + 1)),
  });

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
      <div style={{ opacity: 0.65, marginTop: 2 }}>{emotional.summary}</div>
      <div style={{ opacity: 0.5, marginTop: 2 }}>WORLD · {profile.personality}</div>
      <div style={{ opacity: 0.45, marginTop: 2 }}>
        {transference.saveMetadata.identity} · {Math.round(transference.saveMetadata.confidence * 100)}%
      </div>
      {transference.narrativeReflection && (
        <div style={{ opacity: 0.6, marginTop: 4 }}>{transference.narrativeReflection}</div>
      )}
      {recent.map((r) => {
        const { symbols } = parseInscription(r.room.inscription);
        return (
          <div key={r.room.seed} style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {worst && r.room.seed === worst.room.seed ? "☠ " : "· "}
            {r.room.name} <span style={{ opacity: 0.6 }}>({r.dangerScore})</span>
            {symbols.length > 0 && <span style={{ opacity: 0.45 }}> {symbols.join(",")}</span>}
          </div>
        );
      })}
    </div>
  );
}
