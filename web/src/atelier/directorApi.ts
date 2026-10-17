import { API_BASE_URL } from "../game/roomApi";
import type { Direction } from "./director.ts";
import type { Decision } from "./directorRules.ts";

export const DIRECT_TIMEOUT_MS = 90000;

const FIELDS: Decision["field"][] = ["palette", "symmetry", "projection", "complexity", "density", "anomalyRate", "columns"];

type WireChoice = { field: string; value: string | number; because: string };

export function parseDirection(data: unknown): Direction | null {
  if (typeof data !== "object" || data === null) return null;
  const { title, choices } = data as { title?: unknown; choices?: unknown };
  if (!Array.isArray(choices)) return null;
  const parsed: Direction["choices"] = [];
  for (const raw of choices as WireChoice[]) {
    if (!FIELDS.includes(raw.field as Decision["field"])) continue;
    parsed.push({ decision: { field: raw.field, value: raw.value } as Decision, because: String(raw.because ?? ""), source: "pedro" });
  }
  if (parsed.length === 0) return null;
  return { title: typeof title === "string" && title ? title : "sin título", choices: parsed };
}

export async function requestDirection(narration: string, seed: number, signal?: AbortSignal): Promise<Direction | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());
  try {
    const res = await fetch(`${API_BASE_URL}/atelier/direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narration, seed }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return parseDirection(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
