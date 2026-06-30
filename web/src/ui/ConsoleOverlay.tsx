import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { getTerminalCore } from "../terminal/terminalCore";
import { getPsychPressure } from "../terminal/psych/PsychologicalResponseEngine";
import { ResponseType, TerminalResponse } from "../terminal/types";

interface Line {
  text: string;
  cls: string;
  scramble: boolean;
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

const SCRAMBLE_CHARS = "▓▒░#@%&*!?/\\|<>=+ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

function toLines(res: TerminalResponse): Line[] {
  const cls = TYPE_CLASS[res.responseType] ?? "out";
  return res.lines.map((text) => ({ text, cls, scramble: res.applyGlitch }));
}

const randGlyph = () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];

// Decode-on-reveal: a glitch line arrives as corrupt glyphs and resolves to its
// real text left-to-right. It always settles 100% readable — the corruption is
// in the timing, never baked into the data.
function ConsoleLine({ text, cls, scramble }: Line) {
  const [display, setDisplay] = useState(() => {
    if (!scramble) return text;
    return [...text].map((c) => (c === " " ? " " : randGlyph())).join("");
  });

  useEffect(() => {
    if (!scramble) {
      setDisplay(text);
      return;
    }
    const chars = [...text];
    let frame = 0;
    const id = window.setInterval(() => {
      frame++;
      const revealed = frame; // ~one glyph resolved per 40ms tick
      setDisplay(
        chars
          .map((c, i) => (c === " " ? " " : i < revealed ? c : randGlyph()))
          .join("")
      );
      if (revealed >= chars.length) {
        window.clearInterval(id);
        setDisplay(text);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [text, scramble]);

  return <div className={`line ${cls}`}>{display || " "}</div>;
}

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

  const visible = mode === GameMode.Console || (mode === GameMode.Transition && activeId !== null);

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
    const pressure = getPsychPressure();
    useGame
      .getState()
      .setPsychologicalPressure(pressure.pressure, pressure.recent[pressure.recent.length - 1] ?? null);
    setLines((prev) => [
      ...prev,
      { text: `> ${trimmed}`, cls: "echo", scramble: false },
      ...(res ? toLines(res) : []),
    ]);
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
          placeholder="escribe lo que sientes..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="hint">
        {core.sessionId} · {core.currentState} · {(() => {
          const p = getPsychPressure();
          const last = p.recent[p.recent.length - 1];
          return `presión ${Math.round(p.pressure * 100)}%${last ? ` · ${last}` : ""}`;
        })()} · enter: enviar · esc: desconectar
      </div>
    </div>
  );
}
