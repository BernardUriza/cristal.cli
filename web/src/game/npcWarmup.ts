/** each inhabitant keeps their own thread inside the player's session */
export function npcSessionId(coreSessionId: string, npcId: string): string {
  return `${coreSessionId}-${npcId}`;
}
