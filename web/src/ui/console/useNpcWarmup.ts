import { useEffect } from "react";
import { npcSessionId } from "../../game/npcWarmup";
import { useGame } from "../../game/store";
import { NPC_NODES } from "../../game/worldNodes";
import { warmVoice } from "../../terminal/consoleVoice";

// Opening a voice session takes about 25 s, longer than the walk from any nearby cell.
// So it starts on the player's first step: a visitor who never moves costs nothing.
export function useNpcWarmup(coreSessionId: string): void {
  const walked = useGame((s) => s.funnel.reached.first_step !== undefined);
  useEffect(() => {
    if (!walked) return;
    for (const npc of NPC_NODES) {
      warmVoice(npcSessionId(coreSessionId, npc.id), { id: npc.id, name: npc.label, persona: npc.persona }, npc.greeting);
    }
  }, [walked, coreSessionId]);
}
