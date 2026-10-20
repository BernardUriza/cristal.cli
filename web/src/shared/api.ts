export const API_BASE_URL: string = import.meta.env.VITE_CRISTAL_LLM_URL ?? "http://localhost:8131";

export function apiLive(): boolean {
  return !import.meta.env.DEV && typeof fetch !== "undefined";
}

export async function withTimeout<T>(timeoutMs: number, outer: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  outer?.addEventListener("abort", () => controller.abort());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
}

export function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export function beacon(path: string, body: unknown): void {
  if (!apiLive()) return;
  try {
    void fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    return;
  }
}
