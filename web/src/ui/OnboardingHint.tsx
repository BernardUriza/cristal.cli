import { nextVerb } from "../game/funnel";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";

export function OnboardingHint() {
  const exploring = useGame((s) => s.mode === GameMode.Exploration);
  const verb = useGame((s) => nextVerb(s.funnel));
  const nearNode = useGame((s) => s.nearbyConsoleId !== null || s.nearbyGlyphId !== null);
  if (!exploring || !verb || nearNode) return null;
  return (
    <div className="onboarding-hint" role="status">
      {verb}
    </div>
  );
}
