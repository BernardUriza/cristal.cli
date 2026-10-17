import { describe, expect, it } from "vitest";
import { MORPH_POLICY } from "../../../config/morph";
import { MOTIF_IDS, MOTIFS } from "../figures/index";
import { REGIONS } from "../figures/regions";
import { blendByRegion } from "./blend";
import { caricature, motifNorm } from "./caricature";
import { arcResample, motifContour, regionSlice, type RegionContour } from "./contour";

const N = MORPH_POLICY.pointsPerRegion;
const KEEP = MORPH_POLICY.keepScale;
const contour = (id: string): RegionContour => motifContour(MOTIFS[id], N);
const all = (): RegionContour[] => MOTIF_IDS.map(contour);

function maxDist(p: RegionContour, q: RegionContour): number {
  return Math.max(...p.points.map((a, i) => Math.hypot(a[0] - q.points[i][0], a[1] - q.points[i][1])));
}

function signedArea(c: RegionContour): number {
  let s = 0;
  c.points.forEach((p, i) => { const q = c.points[(i + 1) % c.points.length]; s += p[0] * q[1] - q[0] * p[1]; });
  return s / 2;
}

describe("anclas semánticas y remuestreo por arco", () => {
  it.each(MOTIF_IDS)("%s: cuatro tramos con el mismo número de puntos", (id) => {
    const c = contour(id);
    expect(c.points.length).toBe(REGIONS.length * N);
    REGIONS.forEach((_, k) => expect(regionSlice(c, k).length).toBe(N));
    expect(c.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))).toBe(true);
  });

  it("todas las siluetas recorren el contorno en el mismo sentido", () => {
    const signs = all().map((c) => Math.sign(signedArea(c)));
    expect(new Set(signs).size).toBe(1);
  });

  it("el remuestreo reparte por longitud de arco, no por vértice", () => {
    const pts = arcResample([[0, 0], [0.1, 0], [4, 0]], 4);
    expect(pts.map((p) => p[0])).toEqual([0, 1, 2, 3]);
  });
});

describe("blendByRegion", () => {
  const jag = contour("jaguar"), sir = contour("sirena");

  it("peso 0 en todas las regiones reproduce al primero", () => {
    expect(maxDist(blendByRegion(jag, sir, {}, KEEP).contour, jag)).toBeLessThan(1e-9);
  });

  it("peso 1 en todas las regiones reproduce al segundo (sin alinear)", () => {
    const w = { cabeza: 1, tronco: 1, punta: 1, extremidad: 1 };
    expect(maxDist(blendByRegion(jag, sir, w, KEEP, false).contour, sir)).toBeLessThan(1e-9);
  });

  it("torso de jaguar con cola de sirena: solo la punta cambia y la procedencia lo dice", () => {
    const h = blendByRegion(jag, sir, { punta: 1 }, KEEP);
    expect(h.contour.points.length).toBe(jag.points.length);
    expect(h.provenance.regions.map((r) => r.from)).toEqual(["jaguar", "jaguar", "sirena", "jaguar"]);
    for (const k of [0, 1, 3]) expect(regionSlice(h.contour, k)).toEqual(regionSlice(jag, k).map((p) => [expect.closeTo(p[0], 9), expect.closeTo(p[1], 9)]));
    expect(regionSlice(h.contour, 2)).not.toEqual(regionSlice(jag, 2));
  });

  it("es determinista", () => {
    const w = { cabeza: 0.3, punta: 1 };
    expect(blendByRegion(contour("perro"), contour("mano"), w, KEEP)).toEqual(blendByRegion(contour("perro"), contour("mano"), w, KEEP));
  });

  it("rechaza particiones distintas", () => {
    expect(() => blendByRegion(jag, motifContour(MOTIFS.sirena, N + 1), {}, KEEP)).toThrow();
  });
});

describe("caricature (Brennan 1982)", () => {
  const norm = motifNorm(all(), MORPH_POLICY.normIterations);

  it("la norma tiene la misma partición que los motivos", () => {
    expect(norm.points.length).toBe(REGIONS.length * N);
  });

  it.each(MOTIF_IDS)("%s: k=1 es la identidad", (id) => {
    expect(maxDist(caricature(contour(id), norm, 1), contour(id))).toBeLessThan(1e-9);
  });

  it("k>1 aleja de la norma y k=0 la alcanza", () => {
    const f = contour("perro");
    const d = (c: RegionContour) => maxDist(caricature(c, norm, 1), caricature(f, norm, 0));
    expect(d(caricature(f, norm, 1.6))).toBeGreaterThan(d(f));
  });

  it("es determinista", () => {
    expect(motifNorm(all(), MORPH_POLICY.normIterations)).toEqual(norm);
    expect(caricature(contour("jaguar"), norm, 1.5)).toEqual(caricature(contour("jaguar"), norm, 1.5));
  });
});
