import { API_BASE_URL } from "../game/roomApi";
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

type Handlers = { onDelta: (text: string) => void; onLine: (line: string) => void; onSilence: () => void };

export async function streamVoice(req: VoiceRequest, handlers: Handlers, signal: AbortSignal): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VOICE_TIMEOUT_MS);
  signal.addEventListener("abort", () => controller.abort());
  try {
    const res = await fetch(`${API_BASE_URL}/console/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: req.sessionId,
        input: req.input,
        stance: req.stance,
        pressure: req.pressure,
        local_line: req.localLine,
        confession: req.confession,
        objective: req.objective,
        glyph: req.glyph,
        recent: req.recent.slice(-RECENT_TURNS),
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) return handlers.onSilence();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let settled = false;
    while (!settled) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        if (!raw.trim()) continue;
        const event = JSON.parse(raw) as { type: string; text?: string; line?: string };
        if (event.type === "text" && event.text) handlers.onDelta(event.text);
        else if (event.type === "result" && event.line) {
          handlers.onLine(event.line);
          settled = true;
        } else if (event.type === "error") {
          handlers.onSilence();
          settled = true;
        }
      }
    }
    if (!settled) handlers.onSilence();
  } catch {
    if (!controller.signal.aborted) handlers.onSilence();
  } finally {
    clearTimeout(timer);
  }
}
