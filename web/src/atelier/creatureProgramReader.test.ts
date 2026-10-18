import { describe, expect, it } from "vitest";
import { creatureOf } from "../graphics/application/patio/programa.ts";
import { poblado } from "../graphics/application/patio/poblado.ts";
import { composePatio } from "../graphics/application/patio/index.ts";
import { siteOfBuilding } from "../graphics/application/patio/lugares.ts";
import { PALETTES } from "../graphics/config/palettes.ts";
import { DEFAULT_ARCHITECTURE, sanitizeScene, type Scene } from "../graphics/config/scene.ts";
import { parseDirection } from "./directorApi.ts";
import { readScene } from "./sceneReader.ts";

const opsOf = (narration: string) => readScene(narration).scene.groups.map((g) => [g.creature.name, g.program?.family, g.program?.operations.map((o) => `${o.op} ${o.socket}`)]);

describe("the local director writes CreatureProgram from declared words", () => {
  it("reads families and operations: serpent, a thousand arms, a quadruped with a mermaid tail, a temple body", () => {
    expect(opsOf("tres serpientes rodean el patio")).toEqual([["serpiente", "serpentine", ["replace head"]]]);
    expect(opsOf("un monje de mil brazos")).toEqual([["guardián", "biped", ["replace torso", "replace head", "replace hand", "replace eye", "repeat arm"]]]);
    expect(opsOf("cuatro cuadrúpedos con cola de sirena")).toEqual([["cuadrúpedo", "quadruped", ["replace head", "graft tail", "replace tail"]]]);
    expect(opsOf("un gigante con cuerpo-templo")).toEqual([["gigante", "biped", ["replace head", "architecturalize torso"]]]);
  });

  it("a modifier never summons its own creature, and an alone modifier makes one figure", () => {
    expect(readScene("cuatro cuadrúpedos con cola de sirena").scene.groups).toHaveLength(1);
    expect(opsOf("un cuerpo-templo en el patio")).toEqual([["cuerpo-templo", "biped", ["replace head", "architecturalize torso"]]]);
  });

  it("an operation the body cannot take is left out and said", () => {
    const r = readScene("una serpiente de mil brazos");
    expect(r.scene.groups[0].program?.operations.map((o) => o.op)).toEqual(["replace"]);
    expect(r.because.join(" ")).toContain("no cabe en serpiente");
  });

  it("a narration with no body clue keeps the six-slot plan", () => {
    expect(readScene("una máscara en el patio").scene.groups[0].program).toBeUndefined();
  });
});

describe("a program written by Pedro", () => {
  const wire = (program: unknown) => ({ title: "t", choices: [{ field: "scene", because: "b", value: { groups: [{ creature: { name: "x", parts: { cabeza: "craneo" } }, count: 2, program }] } }] });

  it("survives sanitizeScene when valid, with sockets normalized", () => {
    const d = parseDirection(wire({ family: "quadruped", seed: 7, operations: [{ op: "graft", socket: "cola", family: "serpentine", part: "tail" }] }))!;
    const scene = d.choices[0].decision.value as Scene;
    expect(scene.groups[0].program).toEqual({ family: "quadruped", seed: 7, operations: [{ op: "graft", socket: "tail", family: "serpentine", part: "tail" }] });
  });

  it("an invalid program is discarded with its reason in the provenance; the parts still draw", () => {
    const scene = sanitizeScene({ groups: [{ creature: { name: "x", parts: { cabeza: "craneo" } }, program: { family: "biped", operations: [{ op: "melt", socket: "head" }] } }] })!;
    expect(scene.groups[0].program).toBeUndefined();
    expect(creatureOf(scene.groups[0]).label).toContain("programa descartado: operación 1");
    const late = sanitizeScene({ groups: [{ creature: { name: "s" }, program: { family: "serpentine", operations: [{ op: "repeat", socket: "arm", count: 3, arrangement: "radial" }] } }] })!;
    const c = composePatio({ seed: 3, width: 800, height: 600 });
    const placed = poblado(siteOfBuilding(c.building, c.projector), late, PALETTES.friedeberg, 1, 3);
    expect(placed.provenance?.decision).toContain("programa descartado: missing-socket");
    expect(placed.items).toHaveLength(1);
  });

  it("three families render with operations inside the scene and T2/T3 records for architecturalize", () => {
    const scene: Scene = {
      groups: [
        { creature: { name: "cuadrúpedo", parts: { cuerpo: "perro" } }, count: 2, arrangement: "fila", place: "patio", scale: 1.4, program: { family: "quadruped", seed: 8172, operations: [{ op: "replace", socket: "head", motif: "craneo" }, { op: "graft", socket: "tail", family: "serpentine", part: "tail" }, { op: "architecturalize", socket: "torso", grammar: "facade" }] } },
        { creature: { name: "gigante", parts: { cuerpo: "mascara" } }, count: 1, arrangement: "fila", place: "patio", scale: 1.8, program: { family: "biped", seed: 3, operations: [{ op: "repeat", socket: "arm", count: 3, arrangement: "bilateral" }, { op: "architecturalize", socket: "torso", grammar: "gallery" }] } },
        { creature: { name: "medusa", parts: { cuerpo: "ojo" } }, count: 1, arrangement: "fila", place: "cielo", scale: 1.5, program: { family: "radial", seed: 5, operations: [{ op: "replace", socket: "hand", motif: "ojo" }] } },
      ],
      architecture: DEFAULT_ARCHITECTURE,
    };
    const c = composePatio({ seed: 3, width: 800, height: 600 });
    const placed = poblado(siteOfBuilding(c.building, c.projector), scene, PALETTES.friedeberg, 2, 3);
    expect(placed.items).toHaveLength(4);
    expect(placed.provenance?.decision).toContain("programa quadruped#8172: replace head, graft tail, architecturalize torso");
    expect(placed.records.some((r) => r.rule === "T2_BODY_AS_FACADE" && r.reason.includes("arquitecturiza torso-1 como facade"))).toBe(true);
    expect(placed.records.some((r) => r.rule === "T3_OPENING_AS_PORTAL" && r.reason.includes("gallery"))).toBe(true);
  });
});
