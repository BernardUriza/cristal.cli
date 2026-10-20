import { beacon } from "../shared/api";
import type { FunnelStep } from "./funnel";

const BUILD = (import.meta.env.VITE_CRISTAL_BUILD as string | undefined) ?? "";

export function reportFunnelStep(sessionId: string, step: FunnelStep, seconds: number): void {
  beacon("/telemetry/funnel", { session: sessionId, step, t: seconds, build: BUILD });
}
