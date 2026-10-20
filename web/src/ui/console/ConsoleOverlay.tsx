import { useEffect, useRef, useState } from "react";
import { useGame } from "../../game/store";
import { GameMode } from "../../game/types";
import { objectiveForSlice } from "../../game/VerticalSlice";
import { getTerminalCore } from "../../terminal/terminalCore";
import { ConsoleLine } from "./ConsoleLine";
import { CONSOLE_COPY } from "./copy";
import { objectiveLine, toLines, type Line } from "./lines";
import { pressureHint, runConsoleTurn } from "./turn";
import { useVoiceStream } from "./useVoiceStream";

/** In-world console driven by the ported TerminalCore. Corruption is visual
 *  (CRT skin + decode-on-reveal), never garbled into the text itself. */
export function ConsoleOverlay() {
  const mode = useGame((s) => s.mode);
  const activeId = useGame((s) => s.activeConsoleId);
  const exitConsoleMode = useGame((s) => s.exitConsoleMode);

  const core = getTerminalCore();
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [booted, setBooted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const pendingTimers = useRef<number[]>([]);
  const lastObjective = useRef<string | null>(null);
  const askVoice = useVoiceStream(core.sessionId, setLines);

  const visible = mode === GameMode.Console || (mode === GameMode.Transition && activeId !== null);

  useEffect(() => {
    if (!visible) return;
    const objective = objectiveForSlice(useGame.getState().verticalSlice);
    if (!booted) {
      setLines([...toLines(core.welcome()), objectiveLine(objective)]);
      setBooted(true);
      lastObjective.current = objective;
    } else if (lastObjective.current !== objective) {
      setLines((prev) => [...prev, objectiveLine(objective)]);
      lastObjective.current = objective;
    }
  }, [visible, booted, core]);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  useEffect(() => {
    linesRef.current?.scrollTo({ top: linesRef.current.scrollHeight });
  }, [lines]);

  useEffect(
    () => () => {
      pendingTimers.current.forEach((id) => window.clearTimeout(id));
      pendingTimers.current = [];
    },
    []
  );

  if (!visible) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const turn = runConsoleTurn(core, trimmed);
    if (turn.objective) lastObjective.current = turn.objective;
    setLines((prev) => [...prev, ...turn.lines]);
    const res = turn.response;
    if (res) {
      if (!turn.isCommand) askVoice(trimmed, turn.localLine);
      const appendResponse = () => setLines((prev) => [...prev, ...toLines(res)]);
      if (res.delayMs && res.delayMs > 0) {
        const id = window.setTimeout(() => {
          pendingTimers.current = pendingTimers.current.filter((timer) => timer !== id);
          appendResponse();
        }, res.delayMs);
        pendingTimers.current.push(id);
      } else {
        appendResponse();
      }
    }
    setValue("");
  };

  return (
    <div className="console-overlay crt">
      <div className="lines" ref={linesRef}>
        {lines.map((l, i) => (
          <ConsoleLine key={i} text={l.text} cls={l.cls} scramble={l.scramble} />
        ))}
      </div>
      <div className="input-row">
        <span>&gt;</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "Escape") exitConsoleMode();
          }}
          placeholder={CONSOLE_COPY.placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="hint">
        {core.sessionId} · {core.currentState} · {pressureHint()} · {CONSOLE_COPY.keys}
      </div>
    </div>
  );
}
