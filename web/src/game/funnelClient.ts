import { API_BASE_URL } from "./roomApi";
import type { FunnelStep } from "./funnel";

const BUILD = (import.meta.env.VITE_CRISTAL_BUILD as string | undefined) ?? "";

export function reportFunnelStep(sessionId: string, step: FunnelStep, seconds: number): void {
  if (import.meta.env.DEV || typeof fetch === "undefined") return;
  const body = JSON.stringify({ session: sessionId, step, t: seconds, build: BUILD });
  try {
    void fetch(`${API_BASE_URL}/telemetry/funnel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    return;
  }
}
