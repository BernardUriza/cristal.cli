import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";
import { getTerminalCore } from "../terminal/terminalCore";
import { getPsychPressure } from "../terminal/psych/PsychologicalResponseEngine";
import { ResponseType, TerminalResponse } from "../terminal/types";
import { objectiveForSlice } from "../game/VerticalSlice";
import { worldNodeById } from "../game/worldNodes";
import { parse } from "../terminal/inputParser";
import { streamVoice, type VoiceTurn } from "../terminal/consoleVoice";

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
  const pendingTimers = useRef<number[]>([]);
  const lastObjective = useRef<string | null>(null);
  const voiceAbort = useRef<AbortController | null>(null);
  const recentTurns = useRef<VoiceTurn[]>([]);

  const visible = mode === GameMode.Console || (mode === GameMode.Transition && activeId !== null);

  useEffect(() => {
    if (!visible) return;
    const objective = objectiveForSlice(useGame.getState().verticalSlice);
    if (!booted) {
      setLines([
        ...toLines(core.welcome()),
        { text: `RITO GUIADO: ${objective}`, cls: "system", scramble: false },
      ]);
      setBooted(true);
      lastObjective.current = objective;
    } else if (lastObjective.current !== objective) {
      setLines((prev) => [
        ...prev,
        { text: `RITO GUIADO: ${objective}`, cls: "system", scramble: false },
      ]);
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
      voiceAbort.current?.abort();
    },
    []
  );

  const askVoice = (input: string, localLine: string) => {
    voiceAbort.current?.abort();
    const controller = new AbortController();
    voiceAbort.current = controller;
    const game = useGame.getState();
    const pressure = getPsychPressure();
    const stance = pressure.recent[pressure.recent.length - 1] ?? null;
    recentTurns.current = [...recentTurns.current, { role: "player" as const, text: input }, { role: "cristal" as const, text: localLine }].slice(-8);
    let voiceIndex = -1;
    let draft = "";
    void streamVoice(
      {
        sessionId: core.sessionId,
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
          const shown = draft.replace(/^["«]+/, "");
          setLines((prev) => {
            if (voiceIndex === -1) {
              voiceIndex = prev.length;
              return [...prev, { text: shown, cls: "voice", scramble: false }];
            }
            const next = [...prev];
            next[voiceIndex] = { text: shown, cls: "voice", scramble: false };
            return next;
          });
        },
        onLine: (line) => {
          if (controller.signal.aborted) return;
          recentTurns.current = [...recentTurns.current, { role: "cristal" as const, text: line }].slice(-8);
          setLines((prev) => {
            if (voiceIndex === -1) return [...prev, { text: line, cls: "voice", scramble: false }];
            const next = [...prev];
            next[voiceIndex] = { text: line, cls: "voice", scramble: false };
            return next;
          });
        },
        onSilence: () => undefined,
      },
      controller.signal,
    );
  };

  if (!visible) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const game = useGame.getState();
    const res = core.processInput(trimmed, {
      confessionFragment: game.verticalSlice.confessionFragment,
      invokedGlyph: game.verticalSlice.invokedGlyph,
      objective: objectiveForSlice(game.verticalSlice),
    });
    const pressure = getPsychPressure();
    const lastStance = pressure.recent[pressure.recent.length - 1] ?? null;
    useGame.getState().setPsychologicalPressure(pressure.pressure, lastStance);
    const consoleNode = worldNodeById(game.activeConsoleId);
    if (consoleNode && !parse(trimmed).isCommand) {
      useGame
        .getState()
        .addInscription(trimmed, lastStance, { x: consoleNode.cell[0], y: consoleNode.cell[1] }, consoleNode.accent, Date.now());
      useGame.getState().reachFunnel("first_phrase", Date.now());
    }
    const sliceBefore = useGame.getState().verticalSlice;
    useGame.getState().recordConsoleInput(trimmed);
    const sliceAfter = useGame.getState().verticalSlice;
    const echo = { text: `> ${trimmed}`, cls: "echo", scramble: false };
    setLines((prev) => [...prev, echo]);
    if (!sliceBefore.confessed && sliceAfter.confessed && sliceAfter.confessionFragment) {
      setLines((prev) => [
        ...prev,
        {
          text: `// frase archivada: «${sliceAfter.confessionFragment}» — los glifos la usarán.`,
          cls: "mem",
          scramble: true,
        },
      ]);
    }
    if (sliceBefore.step !== sliceAfter.step) {
      const objective = objectiveForSlice(sliceAfter);
      lastObjective.current = objective;
      setLines((prev) => [
        ...prev,
        { text: `RITO GUIADO: ${objective}`, cls: "system", scramble: false },
      ]);
    }
    if (res) {
      const localLine = res.lines.map((l) => l.trim()).filter(Boolean).join(" ");
      if (!parse(trimmed).isCommand) askVoice(trimmed, localLine);
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
          placeholder="escribe lo que sientes… p. ej. «me pesa el pecho»"
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
