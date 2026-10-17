import { API_BASE_URL } from "./roomApi";

const FRAGMENT_MAX = 64;

export function leaveEcho(text: string): void {
  if (import.meta.env.DEV || typeof fetch === "undefined") return;
  const clean = text.trim().replace(/\s+/g, " ").slice(0, FRAGMENT_MAX);
  if (clean.length < 3) return;
  try {
    void fetch(`${API_BASE_URL}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    return;
  }
}

export async function takeEcho(exclude: string): Promise<string | null> {
  if (import.meta.env.DEV || typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`${API_BASE_URL}/echo?exclude=${encodeURIComponent(exclude)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { text?: unknown };
    return typeof body.text === "string" && body.text.length >= 3 ? body.text : null;
  } catch {
    return null;
  }
}
