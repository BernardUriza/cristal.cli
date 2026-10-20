import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useGame } from "../../game/store";
import { objectiveForSlice } from "../../game/VerticalSlice";
import { streamVoice, RECENT_TURNS, type VoiceTurn } from "../../terminal/consoleVoice";
import { getPsychPressure } from "../../terminal/psych/PsychologicalResponseEngine";
import { placeLine, plainLine, type Line } from "./lines";

export function useVoiceStream(sessionId: string, setLines: Dispatch<SetStateAction<Line[]>>) {
  const abort = useRef<AbortController | null>(null);
  const recentTurns = useRef<VoiceTurn[]>([]);

  useEffect(() => () => abort.current?.abort(), []);

  return (input: string, localLine: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const game = useGame.getState();
    const pressure = getPsychPressure();
    const stance = pressure.recent[pressure.recent.length - 1] ?? null;
    const remember = (...turns: VoiceTurn[]) => {
      recentTurns.current = [...recentTurns.current, ...turns].slice(-RECENT_TURNS);
    };
    remember({ role: "player", text: input }, { role: "cristal", text: localLine });
    let voiceIndex = -1;
    let draft = "";
    const showVoice = (text: string) =>
      setLines((prev) => {
        const placed = placeLine(prev, voiceIndex, plainLine(text, "voice"));
        voiceIndex = placed.index;
        return placed.lines;
      });
    void streamVoice(
      {
        sessionId,
        input,
        stance,
        pressure: pressure.pressure,
        localLine,
        confession: game.verticalSlice.confessionFragment ?? null,
        objective: objectiveForSlice(game.verticalSlice),
        glyph: game.verticalSlice.invokedGlyph ?? null,
        recent: recentTurns.current,
      },
      {
        onDelta: (text) => {
          if (controller.signal.aborted) return;
          draft += text;
          showVoice(draft.replace(/^["«]+/, ""));
        },
        onLine: (line) => {
          if (controller.signal.aborted) return;
          remember({ role: "cristal", text: line });
          showVoice(line);
        },
        onSilence: () => undefined,
        onSafety: (safety) => {
          if (controller.signal.aborted) return;
          setLines((prev) => [...prev, plainLine(safety.line, safety.accion === "urgente" ? "safety urgent" : "safety")]);
        },
      },
      controller.signal
    );
  };
}
