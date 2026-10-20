import { API_BASE_URL, apiLive, beacon } from "../shared/api";

const FRAGMENT_MAX = 64;

export function leaveEcho(text: string): void {
  const clean = text.trim().replace(/\s+/g, " ").slice(0, FRAGMENT_MAX);
  if (clean.length >= 3) beacon("/echo", { text: clean });
}

export async function takeEcho(exclude: string): Promise<string | null> {
  if (!apiLive()) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/echo?exclude=${encodeURIComponent(exclude)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { text?: unknown };
    return typeof body.text === "string" && body.text.length >= 3 ? body.text : null;
  } catch {
    return null;
  }
}
