import type { BodyPart, SceneMotif } from "../graphics/config/scene.ts";
import type { CreatureOp } from "../graphics/domain/motifs/figures/body/program/types.ts";
import type { BodyFamily } from "../graphics/domain/motifs/figures/body/types.ts";

export type FamilyTemplate = { match: RegExp; name: string; family: BodyFamily; parts: Partial<Record<BodyPart, SceneMotif>> };

export const FAMILY_TEMPLATES: FamilyTemplate[] = [
  { match: /serpientes?|v[ií]boras?|culebras?|dragones?/i, name: "serpiente", family: "serpentine", parts: { cabeza: "craneo", cuerpo: "sirena" } },
  { match: /cuadr[uú]pedos?/i, name: "cuadrúpedo", family: "quadruped", parts: { cabeza: "jaguar", cuerpo: "perro" } },
  { match: /b[ií]pedos?|gigantes?|colosos?/i, name: "gigante", family: "biped", parts: { cabeza: "mascara", cuerpo: "escalera" } },
  { match: /medusas?|pulpos?|estrellas? de mar|ruedas? vivas?/i, name: "medusa", family: "radial", parts: { cuerpo: "ojo" } },
];

export type OpWord = { match: RegExp; family: BodyFamily; ops: CreatureOp[]; because: string };

export const OP_WORDS: OpWord[] = [
  { match: /de (mil|cien|muchos) brazos/i, family: "biped", ops: [{ op: "repeat", socket: "arm", count: 4, arrangement: "bilateral" }], because: "de mil brazos: cuatro pares de brazos" },
  { match: /(con )?colas? de sirenas?/i, family: "quadruped", ops: [{ op: "graft", socket: "tail", family: "serpentine", part: "tail" }, { op: "replace", socket: "tail", motif: "sirena" }], because: "cola de sirena: injerto la cola de una serpiente y la escamo de sirena" },
  { match: /(con )?colas? de serpientes?/i, family: "quadruped", ops: [{ op: "graft", socket: "tail", family: "serpentine", part: "tail" }], because: "cola de serpiente: injerto de cola serpentina" },
  { match: /cuerpos?[- ](de )?templos?/i, family: "biped", ops: [{ op: "architecturalize", socket: "torso", grammar: "facade" }], because: "cuerpo-templo: el torso se vuelve fachada" },
  { match: /cuerpos?[- ](de )?torres?/i, family: "biped", ops: [{ op: "architecturalize", socket: "torso", grammar: "tower" }], because: "cuerpo-torre: el torso se vuelve torre de pisos" },
  { match: /cuerpos?[- ](de )?galer[ií]as?/i, family: "biped", ops: [{ op: "architecturalize", socket: "torso", grammar: "gallery" }], because: "cuerpo-galería: el torso se vuelve galería de marcos" },
  { match: /mil ojos|llenos? de ojos/i, family: "radial", ops: [{ op: "replace", socket: "hand", motif: "ojo" }], because: "mil ojos: cada mano es un ojo" },
];

export const OP_WORD_GROUP: FamilyTemplate = { match: /$^/, name: "figura", family: "biped", parts: { cabeza: "mascara", cuerpo: "escalera" } };
