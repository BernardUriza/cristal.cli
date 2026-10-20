import { postJson, withTimeout } from "../shared/api";
import type { Stance } from "./psych/StanceClassifier";

export type VoiceTurn = { role: "player" | "cristal"; text: string };

export type VoiceRequest = {
  sessionId: string;
  input: string;
  stance: Stance | null;
  pressure: number;
  localLine: string;
  confession: string | null;
  objective: string | null;
  glyph: string | null;
  recent: VoiceTurn[];
};

export const VOICE_TIMEOUT_MS = 90000;
export const RECENT_TURNS = 8;

export type SafetyLine = { senal: string; accion: "urgente" | "atencion"; line: string };

type Handlers = { onDelta: (text: string) => void; onLine: (line: string) => void; onSilence: () => void; onSafety?: (safety: SafetyLine) => void };

export async function streamVoice(req: VoiceRequest, handlers: Handlers, signal: AbortSignal): Promise<void> {
  const body = {
    session_id: req.sessionId,
    input: req.input,
    stance: req.stance,
    pressure: req.pressure,
    local_line: req.localLine,
    confession: req.confession,
    objective: req.objective,
    glyph: req.glyph,
    recent: req.recent.slice(-RECENT_TURNS),
  };
  let aborted = false;
  try {
    await withTimeout(VOICE_TIMEOUT_MS, signal, async (linked) => {
      linked.addEventListener("abort", () => (aborted = true));
      const res = await postJson("/console/turn", body, linked);
      if (!res.ok || !res.body) return handlers.onSilence();
      if (!(await readVoiceStream(res.body, handlers))) handlers.onSilence();
    });
  } catch {
    if (!aborted) handlers.onSilence();
  }
}

async function readVoiceStream(stream: ReadableStream<Uint8Array>, handlers: Handlers): Promise<boolean> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return false;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      if (!raw.trim()) continue;
      const event = JSON.parse(raw) as { type: string; text?: string; line?: string; senal?: string; accion?: string };
      if (event.type === "safety" && event.line) handlers.onSafety?.({ senal: event.senal ?? "", accion: event.accion === "urgente" ? "urgente" : "atencion", line: event.line });
      else if (event.type === "text" && event.text) handlers.onDelta(event.text);
      else if (event.type === "result" && event.line) {
        handlers.onLine(event.line);
        return true;
      } else if (event.type === "error") {
        handlers.onSilence();
        return true;
      }
    }
  }
}
