import { useEffect } from "react";
import { npcSessionId, npcsToWarm } from "../../game/npcWarmup";
import { subscribePlayerPose } from "../../game/playerPositionBus";
import { NPC_NODES } from "../../game/worldNodes";
import { warmVoice } from "../../terminal/consoleVoice";

// The first turn of a voice session is the slow one, so it is spent while the player is still walking up.
export function useNpcWarmup(coreSessionId: string): void {
  useEffect(() => {
    const warmed = new Set<string>();
    return subscribePlayerPose((pose) => {
      for (const npc of npcsToWarm(pose, NPC_NODES, warmed)) {
        warmed.add(npc.id);
        warmVoice(npcSessionId(coreSessionId, npc.id), { id: npc.id, name: npc.label, persona: npc.persona }, npc.greeting);
      }
    });
  }, [coreSessionId]);
}
