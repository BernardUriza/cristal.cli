import { useEffect, useRef, useState } from "react";
import { useGame } from "../../game/store";
import { GameMode } from "../../game/types";
import { worldNodeById, type NpcNode } from "../../game/worldNodes";
import { getTerminalCore } from "../../terminal/terminalCore";
import { ConsoleLine } from "./ConsoleLine";
import { CONSOLE_COPY } from "./copy";
import { plainLine, type Line } from "./lines";
import { useVoiceStream } from "./useVoiceStream";

/** Conversation with an inhabitant, held in the world: the scene stays visible and the
 *  words sit in the lower third. No local stance engine: every line the player writes goes straight to the voice,
 *  which answers AS the inhabitant. One transcript per inhabitant per visit. */
export function NpcOverlay() {
  const mode = useGame((s) => s.mode);
  const activeId = useGame((s) => s.activeConsoleId);
  const exitConsoleMode = useGame((s) => s.exitConsoleMode);
  const node = worldNodeById(activeId);
  const npc: NpcNode | null = node?.kind === "npc" ? node : null;

  const core = getTerminalCore();
  const transcripts = useRef(new Map<string, Line[]>());
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const sessionId = npc ? `${core.sessionId}-${npc.id}` : core.sessionId;
  const askVoice = useVoiceStream(sessionId, setLines);

  const visible = npc !== null && (mode === GameMode.Console || mode === GameMode.Transition);

  useEffect(() => {
    if (!npc) return;
    const kept = transcripts.current.get(npc.id);
    setLines(kept ?? [plainLine(npc.greeting, "voice")]);
    inputRef.current?.focus();
  }, [npc]);

  useEffect(() => {
    if (npc) transcripts.current.set(npc.id, lines);
    linesRef.current?.scrollTo({ top: linesRef.current.scrollHeight });
  }, [lines, npc]);

  if (!visible || !npc) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLines((prev) => [...prev, plainLine(CONSOLE_COPY.echo(trimmed), "echo"), plainLine(`${npc.label} te escucha…`, "system")]);
    askVoice(trimmed, "", { id: npc.id, name: npc.label, persona: npc.persona });
    setValue("");
  };

  return (
    <div className="npc-overlay" style={{ color: npc.accent }}>
      <div className="npc-name">{npc.label}</div>
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
          placeholder="escríbele lo que quieras…"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="hint">enter: decírselo · esc: seguir caminando</div>
    </div>
  );
}
