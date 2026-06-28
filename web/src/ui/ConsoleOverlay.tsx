import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { getTerminalCore } from "../terminal/terminalCore";
import { ResponseType, TerminalResponse } from "../terminal/types";

interface Line {
  text: string;
  cls: string;
}

const TYPE_CLASS: Record<ResponseType, string> = {
  [ResponseType.System]: "system",
  [ResponseType.Memory]: "mem",
  [ResponseType.Identity]: "identity",
  [ResponseType.Emotional]: "emo",
  [ResponseType.Error]: "err",
  [ResponseType.Default]: "out",
  [ResponseType.AI]: "out",
};

function toLines(res: TerminalResponse): Line[] {
  const cls = TYPE_CLASS[res.responseType] ?? "out";
  return res.lines.map((text) => ({ text, cls }));
}

/** In-world console driven by the ported TerminalCore (state machine, patterns,
 *  memory, arcana). Replaces the earlier echo placeholder. */
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

  const visible = mode === GameMode.Console || (mode === GameMode.Transition && activeId !== null);

  // Boot banner the first time the console is opened this page-load.
  useEffect(() => {
    if (visible && !booted) {
      setLines(toLines(core.welcome()));
      setBooted(true);
    }
  }, [visible, booted, core]);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  useEffect(() => {
    linesRef.current?.scrollTo({ top: linesRef.current.scrollHeight });
  }, [lines]);

  if (!visible) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const res = core.processInput(trimmed);
    setLines((prev) => [
      ...prev,
      { text: `> ${trimmed}`, cls: "echo" },
      ...(res ? toLines(res) : []),
    ]);
    setValue("");
  };

  return (
    <div className="console-overlay">
      <div className="lines" ref={linesRef}>
        {lines.map((l, i) => (
          <div key={i} className={`line ${l.cls}`}>
            {l.text || " "}
          </div>
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
          placeholder="escribe lo que sientes..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="hint">
        {core.sessionId} · {core.currentState} · enter: enviar · esc: desconectar · prueba: help · status · invoke arcana 18
      </div>
    </div>
  );
}
