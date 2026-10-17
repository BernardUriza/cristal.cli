import { describe, expect, it } from "vitest";
import { PALETTES } from "../../config/palettes.ts";
import type { Scene } from "../../config/scene.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { MOTIFS } from "../../domain/motifs/figures/index.ts";
import { rect } from "../../domain/shapes.ts";
import { occluders, paintOrder, precedence, type SceneItem } from "./escena.ts";
import { composePatio } from "./index.ts";

const FORWARD: Vec3 = [-0.36, -0.58, -0.73];
const item = (id: string, kind: SceneItem["kind"], min: Vec3, max: Vec3, depth: number): SceneItem => ({ id, kind, box: { min, max }, screen: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, depth, shapes: [rect(0, 0, 1, 1, { fill: id })] });

const people: Scene = {
  groups: [
    { creature: { name: "robot", parts: { cabeza: "craneo", ojos: "ojo", cuerpo: "escalera" } }, count: 8, arrangement: "escalera", place: "escalera", scale: 1 },
    { creature: { name: "mano", parts: { cuerpo: "mano" } }, count: 1, arrangement: "fila", place: "patio", scale: 2.2 },
  ],
  architecture: { footprint: "cuadrado", courtyard: "grande", heights: "vertiginoso" },
};

describe("joint occlusion of solids and figures", () => {
  it("a solid between the camera and a figure is painted after it, one behind it before", () => {
    const figure = item("figura", "figure", [0, 0, 0], [0.4, 3, 0.4], 0.5);
    const tower = item("torre", "solid", [1, 0, 1], [3, 12, 3], 0.4);
    const back = item("fondo", "solid", [-4, 0, -4], [-2, 6, -2], 0.6);
    expect(precedence(tower, figure, FORWARD)).toBe(1);
    expect(precedence(back, figure, FORWARD)).toBe(-1);
    expect(paintOrder([tower, figure, back], FORWARD).map((i) => i.id)).toEqual(["fondo", "figura", "torre"]);
    expect([...occluders([tower, back], [figure], FORWARD)]).toEqual(["torre"]);
  });

  it("a figure standing on a roof is painted after the roof", () => {
    const roof = item("azotea", "solid", [0, 4, 0], [6, 4.3, 6], 0.4);
    const figure = item("figura", "figure", [3, 4.3, 3], [3.4, 7, 3.4], 0.45);
    expect(paintOrder([figure, roof], FORWARD).map((i) => i.id)).toEqual(["azotea", "figura"]);
  });

  it("an inhabited patio paints figures and their occluders in one «habitada» stage and logs T1-T4", () => {
    const c = composePatio({ seed: 4, width: 1200, height: 900, architecture: people.architecture, azimuth: 0.46, detail: 2 }, undefined, { scene: people, pal: PALETTES.friedeberg, detail: 2, seed: 4 });
    expect(c.stages.map((s) => s.name)).toEqual(["planta", "volúmenes", "ornamento", "símbolos", "anomalía", "habitada"]);
    const rules = new Set(c.stages.flatMap((s) => s.provenance?.rewrites ?? []).map((r) => r.rule));
    expect([...rules].sort()).toEqual(["T1_COLUMN_AS_BODY", "T2_BODY_AS_FACADE", "T3_OPENING_AS_PORTAL", "T4_INHABITED_FRIEZE"]);
    const habitada = c.stages[5];
    expect(Number(habitada.provenance?.params.solidos_delante)).toBeGreaterThan(0);
    expect(habitada.provenance?.rewrites?.every((r) => r.reason.length > 0 && r.seed === 4)).toBe(true);
  });

  it("without inhabitants the stages and the motifs' own drawing stay as they were", () => {
    expect(composePatio({ seed: 7 }).stages.map((s) => s.name)).toEqual(["planta", "volúmenes", "ornamento", "símbolos", "anomalía"]);
    const skull = MOTIFS.craneo.parts(0, 0, { size: 100, detail: 1, fill: "#fff", ink: "#000", accent: "#f00" });
    expect(skull.children.map((p) => `${p.geometryId}:${p.role}`)).toEqual(["cuenca:opening", "cuenca:opening", "boca:opening"]);
    const hand = MOTIFS.mano.parts(0, 0, { size: 100, detail: 1, fill: "#fff", ink: "#000", accent: "#f00" });
    expect(hand.children.filter((p) => p.geometryId === "dedo")).toHaveLength(4);
    expect(hand.children.find((p) => p.geometryId === "palma")?.role).toBe("enclosure");
    expect(MOTIFS.sirena.parts(0, 0, { size: 100, detail: 1, fill: "#fff", ink: "#000", accent: "#f00" }).children.map((p) => p.role)).toEqual(["enclosure", "support"]);
  });
});
