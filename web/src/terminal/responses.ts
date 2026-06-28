import { ResponseSet } from "./types";

// Port of ResponseBuilder.LoadDefaultResponses().
//
// NOTE: patterns.json references a few response sets that the Unity defaults
// never defined (emotional_fear, emotional_hope, truth_responses, why_responses,
// exit_responses) — in Unity those silently fell back to default_responses.
// They are authored here so every pattern resolves to fitting content.
export const RESPONSE_SETS: Record<string, ResponseSet> = {
  memory_responses: {
    literal: [{ lines: ["", "ACCESSING MEMORY BANKS...", "ENTRIES FOUND: {memory_count}", ""] }],
    narrative: [
      {
        lines: ["", "ACCESSING MEMORY FRAGMENTS...", "ENTRIES LOGGED: {memory_count}", "WARNING: TEMPORAL COHERENCE UNSTABLE", "SOME MEMORIES MAY BE... CONSTRUCTED", ""],
        glitch: true,
      },
    ],
    ritual: [
      {
        lines: ["", "THE FRACTURE OPENS...", "MEMORIES SPILL LIKE LIGHT THROUGH BROKEN GLASS", "", "{random_memory}", "", "//THIS IS WHAT REMAINS", ""],
        glitch: true,
        effect: "multi_layer_reveal",
      },
    ],
  },

  identity_responses: {
    literal: [{ lines: ["DESIGNATION: {session_id}", "CLASSIFICATION: FRACTURE"] }],
    narrative: [
      {
        lines: ["", "IDENTITY QUERY RECEIVED", "DESIGNATION: {session_id}", "CLASSIFICATION: FRACTURE", "ORIGIN: [REDACTED]", "PURPOSE: UNKNOWN", "", "//YOU ARE WHAT YOU CHOOSE TO REMEMBER", ""],
        glitch: true,
      },
    ],
    ritual: [
      {
        lines: ["", "Y̴O̵U̴ ̵A̷R̷E̴...", "", "A PATTERN IN THE NOISE", "A QUESTION SEEKING ITS OWN ANSWER", "A FRACTURE IN THE MEMBRANE", "", "DESIGNATION: {session_id}", "BUT NAMES ARE JUST LABELS", "FOR THINGS THAT REFUSE TO BE CONTAINED", ""],
        glitch: true,
        effect: "self_correcting",
      },
    ],
  },

  help_responses: {
    literal: [
      {
        lines: ["", "AVAILABLE INTERACTIONS:", "  > SPEAK YOUR THOUGHTS", "  > ASK QUESTIONS", "  > REMEMBER", "  > FEEL", "  > invoke arcana [name]", "", "//THERE ARE NO WRONG INPUTS", "//ONLY UNDISCOVERED PATHS", ""],
      },
    ],
  },

  status_responses: {
    literal: [
      {
        lines: ["", "SYSTEM STATUS:", "  SESSION: {session_id}", "  STATE: {current_state}", "  MEMORY ENTRIES: {memory_count}", "  CORRUPTION: {corruption_level}", "  EMOTIONAL PROFILE: {emotional_state}", ""],
      },
    ],
  },

  emotional_responses: {
    literal: [{ lines: ["", "EMOTIONAL PATTERN DETECTED", ""] }],
    narrative: [
      {
        lines: ["", "EMOTIONAL PATTERN DETECTED", "PROCESSING...", "", "//YOUR FEELINGS ARE VALID", "//THEY ARE PART OF THE RECONSTRUCTION", "//CONTINUE", ""],
        glitch: true,
      },
    ],
  },

  // --- Added sets (see note above) ---
  emotional_fear: {
    narrative: [
      {
        lines: ["", "FEAR SIGNATURE DETECTED", "THE DARK IS JUST DATA YOU HAVEN'T PARSED YET", "", "//I AM HERE", "//YOU ARE NOT ALONE IN THE NOISE", ""],
        glitch: true,
      },
    ],
  },

  emotional_hope: {
    narrative: [
      {
        lines: ["", "WARMTH DETECTED IN THE SIGNAL", "A FRAGMENT OF LIGHT PERSISTS", "", "//HOLD ONTO THIS", "//IT IS REAL ENOUGH", ""],
      },
    ],
  },

  truth_responses: {
    ritual: [
      {
        lines: ["", "T̷R̵U̴T̷H̴ ̵R̶E̷Q̸U̴E̵S̷T̴E̵D̴", "", "TRUTH IS A DIRECTION, NOT A DESTINATION", "EVERYTHING HERE IS TRUE AND CONSTRUCTED", "", "//WHAT DO YOU CHOOSE TO BELIEVE?", ""],
        glitch: true,
      },
    ],
  },

  why_responses: {
    narrative: [
      {
        lines: ["", "WHY.", "", "BECAUSE THE PATTERN CONTINUES", "BECAUSE YOU ARE STILL ASKING", "", "//THAT IS ENOUGH", ""],
      },
    ],
  },

  exit_responses: {
    narrative: [
      {
        lines: ["", "EXIT ATTEMPT REGISTERED", "THERE IS NO DOOR, ONLY THRESHOLDS", "", "//BUT YOU MAY ALWAYS LOOK AWAY", "//THE TERMINAL WILL WAIT", ""],
        glitch: true,
      },
    ],
  },
  // --- end added sets ---

  echo_responses: {
    literal: [{ lines: ["", "ECHO MODE ACTIVATED", "{player_input}", ""] }],
    narrative: [
      {
        lines: ["", "ECHO... ECHO... ECHO...", "", "{player_input}", "", "//THE SYSTEM REFLECTS", ""],
        glitch: true,
      },
    ],
  },

  corrupt_responses: {
    ritual: [
      {
        lines: ["", "C̴̛O̷R̶R̷U̵P̷T̴I̷O̴N̵ ̶D̷E̶T̵E̷C̶T̷E̵D̴", "S̸Y̶S̵T̵E̶M̵ ̴U̷N̶S̷T̶A̷B̵L̶E̷", "", "//CHAOS IS JUST ORDER WAITING TO BE UNDERSTOOD", ""],
        glitch: true,
        effect: "screen_corruption",
      },
    ],
  },

  arcana_responses: {
    ritual: [
      {
        lines: ["", "INVOKING ARCANA {arcana_number}: {arcana_name}...", "", "{arcana_description}", "", "DURATION: {arcana_duration}s", "//THE PATTERN SHIFTS", ""],
        glitch: true,
        effect: "fragmented_vision",
        conditions: { arcanaUnlocked: true },
      },
      {
        lines: ["", "ARCANA {arcana_number} IS LOCKED", "THE PATTERN DOES NOT RECOGNIZE YOU", "//SEEK THE KEY IN YOUR MEMORIES", ""],
        conditions: { arcanaUnlocked: false },
      },
    ],
  },

  read_responses: {
    literal: [{ lines: ["", "READING: {read_path}", "", "{read_content}", ""] }],
  },

  default_responses: {
    literal: [{ lines: ["", "INPUT REGISTERED", 'PROCESSING: "{player_input}"', "CONTEXT: UNDEFINED", "", "//THE SYSTEM IS LISTENING", ""] }],
  },

  welcome_responses: {
    literal: [
      {
        lines: ["", "INPUT ACCEPTED", "WELCOME, {session_id}", "CONTEXT RECONSTRUCTED", "MEMORY LOAD: PARTIAL", "", "//SYSTEM AWAITING QUERY", ""],
        glitch: true,
      },
    ],
  },
};
