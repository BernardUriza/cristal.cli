// Mirrors Cristal.CLI.Labyrinth.GameMode from the Unity project.
// `Room` is the web addition: the player stands inside a generated LLM room.
export enum GameMode {
  Exploration = "Exploration",
  Console = "Console",
  Transition = "Transition",
  Room = "Room",
}

export type Locomotion = "idle" | "walk" | "run";

// Procedural form of a generated room — drives its proportions and geometry.
export type RoomShape = "chamber" | "corridor" | "shaft" | "void";
