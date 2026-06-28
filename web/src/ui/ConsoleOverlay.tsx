import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";

interface Line {
  text: string;
  system?: boolean;
}

const BOOT: Line[] = [
  { text: "CRISTAL.CLI // consola in-world", system: true },
  { text: "escribe lo que SIENTES, no lo que sabes.", system: true },
  { text: "[ESC] para desconectar", system: true },
];

/**
 * Placeholder for the shared TerminalCore. The full port (state machine,
 * arcana, memory, AI responses) lands in a later phase; for now it echoes
 * input so the Exploration <-> Console flow is verifiable end to end.
 */
export function ConsoleOverlay() {
  const mode = useGame((s) => s.mode);
  const activeId = useGame((s) => s.activeConsoleId);
  const exitConsoleMode = useGame((s) => s.exitConsoleMode);

  const [lines, setLines] = useState<Line[]>(BOOT);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  const visible = mode === GameMode.Console || (mode === GameMode.Transition && activeId !== null);

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
    setLines((prev) => [
      ...prev,
      { text: `> ${trimmed}` },
      { text: "// el cristal escucha...", system: true },
    ]);
    setValue("");
  };

  return (
    <div className="console-overlay">
      <div className="lines" ref={linesRef}>
        {lines.map((l, i) => (
          <div key={i} className={l.system ? "line system" : "line"}>
            {l.text}
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
          placeholder="..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="hint">enter: enviar · esc: desconectar</div>
    </div>
  );
}
