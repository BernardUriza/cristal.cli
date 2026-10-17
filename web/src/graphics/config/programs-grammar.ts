import type { ArchitectureProgram } from "../domain/grammar/types.ts";

export type GrammarProgramName = "palacio-secreto" | "ciudad-torres" | "templo-patios" | "laberinto-salones";

export type GrammarProgramEntry = { narration: string; program: ArchitectureProgram };

export const GRAMMAR_PROGRAMS: Record<GrammarProgramName, GrammarProgramEntry> = {
  "palacio-secreto": {
    narration: "palacio con habitaciones secretas",
    program: {
      seed: 11,
      archetype: "palace",
      rules: [
        { rule: "R2", target: "root", params: { chambers: 5 } },
        { rule: "R6", target: "hall-1", params: {} },
        { rule: "R5", target: "courtyard-1", params: { scale: 0.55 } },
      ],
    },
  },
  "ciudad-torres": {
    narration: "ciudad de torres conectadas",
    program: {
      seed: 23,
      archetype: "city",
      rules: [
        { rule: "R3", target: "root", params: { chambers: 3 } },
        { rule: "R4", target: "gallery-1", params: {} },
        { rule: "R4", target: "gallery-1", params: {} },
      ],
    },
  },
  "templo-patios": {
    narration: "templo alrededor de patios sucesivos",
    program: {
      seed: 37,
      archetype: "temple",
      rules: [
        { rule: "R1", target: "root", params: { galleries: 4 } },
        { rule: "R5", target: "courtyard-1", params: { scale: 0.6 } },
        { rule: "R1", target: "complex-1", params: { galleries: 4 } },
      ],
    },
  },
  "laberinto-salones": {
    narration: "laberinto de salones",
    program: {
      seed: 41,
      archetype: "labyrinth",
      rules: [
        { rule: "R2", target: "root", params: { chambers: 6 } },
        { rule: "R6", target: "hall-1", params: {} },
        { rule: "R6", target: "hall-1", params: {} },
      ],
    },
  },
};
