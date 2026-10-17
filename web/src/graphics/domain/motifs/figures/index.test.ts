import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../shared/rng";
import { pointInPolygon, polygonBounds } from "../../bezier";
import type { Shape } from "../../shapes";
import { MOTIF_IDS, MOTIFS, motifsByTag, type MotifParams } from "./index";

const base: MotifParams = { size: 200, detail: 1, fill: "#000", ink: "#fff", accent: "#f0f" };
const withDetail = (detail: MotifParams["detail"]): MotifParams => ({ ...base, detail });

function flatten(shapes: Shape[]): Shape[] {
  return shapes.flatMap((s) => (s.kind === "group" ? flatten(s.children) : [s]));
}

describe("motif library", () => {
  it("registers eight motifs with provenance metadata", () => {
    expect(MOTIF_IDS).toEqual(["ojo", "mano", "craneo", "perro", "jaguar", "escalera", "mascara", "sirena"]);
    for (const id of MOTIF_IDS) {
      const m = MOTIFS[id];
      expect(m.id).toBe(id);
      expect(m.author).toBe("CRISTAL.CLI (Bézier propio)");
      expect(m.license).toBe("CC0-1.0");
      expect(m.algorithm).toBe("bezier_contours");
      expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(m.tags.length).toBeGreaterThan(0);
    }
    expect(motifsByTag("animal").map((m) => m.id)).toEqual(["perro", "jaguar"]);
    expect(motifsByTag("arquitectura").map((m) => m.id)).toEqual(["escalera"]);
  });

  it.each(MOTIF_IDS)("%s: closed silhouette with ≥24 points inside the size box", (id) => {
    const poly = MOTIFS[id].silhouette(base);
    expect(poly.length).toBeGreaterThanOrEqual(24);
    const b = polygonBounds(poly);
    expect(b.minX).toBeGreaterThanOrEqual(-100.5);
    expect(b.maxX).toBeLessThanOrEqual(100.5);
    expect(b.minY).toBeGreaterThanOrEqual(-100.5);
    expect(b.maxY).toBeLessThanOrEqual(100.5);
    expect(b.maxX - b.minX).toBeGreaterThan(80);
  });

  it.each(MOTIF_IDS)("%s: deterministic per seed, more shapes at detail 3, readable provenance", (id) => {
    const m = MOTIFS[id];
    const a = m.draw(50, 50, withDetail(3), mulberry32(42));
    const b = m.draw(50, 50, withDetail(3), mulberry32(42));
    expect(a).toEqual(b);
    const d1 = m.draw(50, 50, withDetail(1), mulberry32(42));
    const d2 = m.draw(50, 50, withDetail(2), mulberry32(42));
    expect(d2.shapes.length).toBeGreaterThan(d1.shapes.length);
    expect(a.shapes.length).toBeGreaterThan(d2.shapes.length);
    expect(a.shapes[0].kind).toBe("polygon");
    expect(a.provenance.algorithm).toMatch(/^bezier_contours@/);
    expect(a.provenance.params.detail).toBe(3);
    expect(a.provenance.decision.length).toBeGreaterThan(10);
    for (const v of Object.values(a.provenance.params)) expect(["number", "string"]).toContain(typeof v);
  });

  it.each(["mano", "jaguar"])("%s: every stipple dot lies inside the silhouette", (id) => {
    const m = MOTIFS[id];
    const poly = m.silhouette(withDetail(3));
    const drawing = m.draw(0, 0, withDetail(3), mulberry32(5));
    const dots = flatten(drawing.shapes).filter((s) => s.kind === "circle" && s.r < 2);
    expect(dots.length).toBeGreaterThan(15);
    for (const d of dots) if (d.kind === "circle") expect(pointInPolygon([d.cx, d.cy], poly)).toBe(true);
  });

  it("mirror and rotate move the silhouette as a rigid body", () => {
    const plain = MOTIFS.perro.silhouette(base);
    const mirrored = MOTIFS.perro.silhouette({ ...base, mirror: true });
    plain.forEach((p, i) => {
      expect(mirrored[i][0]).toBeCloseTo(-p[0], 9);
      expect(mirrored[i][1]).toBeCloseTo(p[1], 9);
    });
    const rotated = MOTIFS.perro.silhouette({ ...base, rotate: 180 });
    plain.forEach((p, i) => {
      expect(rotated[i][0]).toBeCloseTo(-p[0], 9);
      expect(rotated[i][1]).toBeCloseTo(-p[1], 9);
    });
  });
});
