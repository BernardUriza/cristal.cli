import { API_BASE_URL } from "../game/roomApi";
import type { Direction } from "./director.ts";
import type { Decision } from "./directorRules.ts";

export const DIRECT_TIMEOUT_MS = 90000;

import { sanitizeScene } from "../graphics/config/scene.ts";
import { ANOMALIES, COMPOSITIONS, MAX_LANGUAGES, MAX_MOTIFS, MOTIF_NAMES, ORNAMENT_LANGUAGES, isOneOf } from "./vocabulary.ts";

type WireChoice = { field: string; value: unknown; because: string };

function subset<T extends string>(list: readonly T[], value: unknown, max: number): T[] | null {
  if (!Array.isArray(value)) return null;
  const kept: T[] = [];
  for (const v of value) if (isOneOf(list, v) && !kept.includes(v) && kept.length < max) kept.push(v);
  return kept;
}

function decisionOf(raw: WireChoice): Decision | null {
  const { field, value } = raw;
  if (field === "scene") {
    const scene = sanitizeScene(value);
    return scene && scene.groups.length > 0 ? { field, value: scene } : null;
  }
  if (field === "composition") return isOneOf(COMPOSITIONS, value) ? { field, value } : null;
  if (field === "anomaly") return isOneOf(ANOMALIES, value) ? { field, value } : null;
  if (field === "motifs") {
    const list = subset(MOTIF_NAMES, value, MAX_MOTIFS);
    return list ? { field, value: list } : null;
  }
  if (field === "ornament") {
    const list = subset(ORNAMENT_LANGUAGES, value, MAX_LANGUAGES);
    return list && list.length > 0 ? { field, value: list } : null;
  }
  if (field === "palette" || field === "symmetry" || field === "projection") return typeof value === "string" ? ({ field, value } as Decision) : null;
  if (field === "complexity" || field === "density" || field === "anomalyRate" || field === "columns") return typeof value === "number" ? ({ field, value } as Decision) : null;
  return null;
}

export function parseDirection(data: unknown): Direction | null {
  if (typeof data !== "object" || data === null) return null;
  const { title, choices } = data as { title?: unknown; choices?: unknown };
  if (!Array.isArray(choices)) return null;
  const parsed: Direction["choices"] = [];
  for (const raw of choices as WireChoice[]) {
    const decision = decisionOf(raw);
    if (decision) parsed.push({ decision, because: String(raw.because ?? ""), source: "pedro" });
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
