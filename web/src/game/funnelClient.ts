import { API_BASE_URL } from "./roomApi";
import type { FunnelStep } from "./funnel";

const BUILD = (import.meta.env.VITE_CRISTAL_BUILD as string | undefined) ?? "";

export function reportFunnelStep(sessionId: string, step: FunnelStep, seconds: number): void {
  if (import.meta.env.DEV || typeof navigator === "undefined") return;
  const body = JSON.stringify({ session: sessionId, step, t: seconds, build: BUILD });
  const url = `${API_BASE_URL}/telemetry/funnel`;
  try {
    const sent = navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }));
    if (sent) return;
    void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    return;
  }
}
