import type { SliceStep } from "../game/VerticalSlice";
import type { WorldNode } from "../game/worldNodes";
import type { SymbolicArchetype } from "../game/symbolicBus";

export interface PromptCopy {
  action: string;
  hint: string | null;
  accent: string;
}

export function promptForNode(node: WorldNode, step: SliceStep): PromptCopy {
  if (node.kind === "glyph") {
    return { action: `invocar ${node.label}`, hint: glyphHint(step), accent: node.accent };
  }
  return { action: `conectar ${node.label}`, hint: consoleHint(step), accent: node.accent };
}

function glyphHint(step: SliceStep): string | null {
  switch (step) {
    case "open_console":
      return "sin consola conectada, el glifo abrirá un cuarto sin tu frase";
    case "confess":
      return "confiesa primero en la consola y el glifo llevará tu frase";
    case "invoke_glyph":
      return "el glifo responderá con tu confesión";
    case "cross_room":
    case "return_changed":
    case "complete":
      return "otro glifo abre otra variación";
  }
}

function consoleHint(step: SliceStep): string | null {
  switch (step) {
    case "open_console":
      return "el rito empieza aquí";
    case "confess":
      return "escribe una frase emocional, no un comando";
    default:
      return null;
  }
}

export function roomLoadingLine(archetype: SymbolicArchetype | null): string {
  return archetype
    ? `/dev/prophet-0 reescribiendo el cuarto · ${archetype.toUpperCase()}`
    : "/dev/prophet-0 reescribiendo el cuarto";
}

export function roomErrorLine(error: string): string {
  const compact = error.replace(/^Error:\s*/i, "").trim();
  return `la liturgia falló: ${compact || "el cuarto no respondió"}`;
}
