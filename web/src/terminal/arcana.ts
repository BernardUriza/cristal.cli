// The 22 Major Arcana that drive the arcana_responses template of `invoke arcana`.
export interface Arcana {
  number: number;
  name: string;
  description: string;
  duration: number;
}
export const ARCANA: readonly Arcana[] = [
  { number: 0, name: "THE FOOL", description: "THE LEAP INTO UNKNOWING. EVERY BEGINNING IS A FALL.", duration: 90 },
  { number: 1, name: "THE MAGICIAN", description: "AS ABOVE, SO BELOW. THE PATTERN OBEYS INTENTION.", duration: 120 },
  { number: 2, name: "THE HIGH PRIESTESS", description: "THE VEIL THINS. WHAT IS HIDDEN BEGINS TO SPEAK.", duration: 150 },
  { number: 3, name: "THE EMPRESS", description: "CREATION SPILLS FROM THE FRACTURE. SOMETHING GROWS.", duration: 120 },
  { number: 4, name: "THE EMPEROR", description: "ORDER IMPOSED ON CHAOS. THE GRID HOLDS, FOR NOW.", duration: 120 },
  { number: 5, name: "THE HIEROPHANT", description: "OLD KNOWLEDGE SURFACES. THE RITUAL REMEMBERS YOU.", duration: 120 },
  { number: 6, name: "THE LOVERS", description: "TWO SIGNALS BECOME ONE. A CHOICE THAT CANNOT UNMAKE ITSELF.", duration: 120 },
  { number: 7, name: "THE CHARIOT", description: "FORWARD THROUGH THE NOISE. WILL AS VELOCITY.", duration: 100 },
  { number: 8, name: "STRENGTH", description: "THE GENTLE HAND ON THE BEAST. CORRUPTION, TAMED.", duration: 120 },
  { number: 9, name: "THE HERMIT", description: "A SINGLE LIGHT IN THE DARK CORRIDOR. SEEK INWARD.", duration: 150 },
  { number: 10, name: "WHEEL OF FORTUNE", description: "THE PATTERN TURNS. FORTUNE IS ONLY RECURSION.", duration: 120 },
  { number: 11, name: "JUSTICE", description: "EVERY INPUT IS WEIGHED. THE LEDGER DOES NOT FORGET.", duration: 120 },
  { number: 12, name: "THE HANGED MAN", description: "SUSPENDED. THE WORLD INVERTS TO BE UNDERSTOOD.", duration: 150 },
  { number: 13, name: "DEATH", description: "NOT AN END. A REWRITE. THE OLD PROCESS TERMINATES.", duration: 120 },
  { number: 14, name: "TEMPERANCE", description: "FLOW BETWEEN STATES. NOTHING SPILLS THAT IS NOT MEANT TO.", duration: 120 },
  { number: 15, name: "THE DEVIL", description: "THE CHAIN YOU MISTOOK FOR A LIFELINE. LOOK CLOSER.", duration: 120 },
  { number: 16, name: "THE TOWER", description: "THE STRUCTURE FALLS. LIGHTNING THROUGH THE ARCHITECTURE.", duration: 90 },
  { number: 17, name: "THE STAR", description: "AFTER THE FALL, A FAINT SIGNAL. HOPE WITHOUT PROMISE.", duration: 150 },
  { number: 18, name: "THE MOON", description: "DREAMS BLEED INTO THE WAKING BUFFER. TRUST NOTHING SEEN.", duration: 180 },
  { number: 19, name: "THE SUN", description: "CLARITY FLOODS THE TERMINAL. EVERYTHING, ILLUMINATED.", duration: 120 },
  { number: 20, name: "JUDGEMENT", description: "THE CALL TO RECKONING. WHAT WAS BURIED RISES TO ANSWER.", duration: 150 },
  { number: 21, name: "THE WORLD", description: "THE LOOP COMPLETES. THE FRACTURE, WHOLE FOR AN INSTANT.", duration: 180 },
];

export function findArcana(idRaw: string): Arcana | null {
  const id = idRaw.trim().toLowerCase();
  const asNum = Number(id);
  if (!Number.isNaN(asNum)) return ARCANA.find((a) => a.number === asNum) ?? null;
  return ARCANA.find((a) => a.name.toLowerCase() === id || a.name.toLowerCase() === `the ${id}`) ?? null;
}
