import { describe, expect, it } from "vitest";
import { MORPH_POLICY } from "../../../config/morph";
import type { Vec2 } from "../../shapes";
import { MOTIF_IDS, MOTIFS } from "../figures/index";
import { REGIONS } from "../figures/regions";
import { familyNorm, morphMotif } from "./apply";
import { blendByRegion } from "./blend";
import { caricature, exaggerate, familyOf, motifNorm } from "./caricature";
import { arcResample, motifContour, regionSlice, type RegionContour } from "./contour";
import { isSimple, selfIntersections } from "./intersect";

const P = MORPH_POLICY;
const N = P.pointsPerRegion;
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

describe("detector de autointersección", () => {
  it("un cuadrado es simple, un moño se cruza una vez y una estrella de cinco puntas cinco", () => {
    expect(selfIntersections([[0, 0], [1, 0], [1, 1], [0, 1]])).toEqual([]);
    expect(selfIntersections([[0, 0], [1, 1], [1, 0], [0, 1]])).toEqual([[0, 2]]);
    const star: Vec2[] = Array.from({ length: 5 }, (_, i) => [Math.cos((4 * Math.PI * i) / 5), Math.sin((4 * Math.PI * i) / 5)]);
    expect(selfIntersections(star)).toHaveLength(5);
  });

  it("los vértices compartidos y los tramos adyacentes no cuentan como cruce", () => {
    expect(isSimple([[0, 0], [1, 0], [1, 0], [1, 1], [0, 1]])).toBe(true);
  });

  it.each(MOTIF_IDS)("%s: la silueta remuestreada no se cruza (control de presencia de los demás tests)", (id) => {
    expect(isSimple(contour(id).points)).toBe(true);
  });
});

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
    expect(maxDist(blendByRegion(jag, sir, {}, P).contour, jag)).toBeLessThan(1e-9);
  });

  it("peso 1 en todas las regiones reproduce al segundo (sin alinear)", () => {
    const w = { cabeza: 1, tronco: 1, punta: 1, extremidad: 1 };
    expect(maxDist(blendByRegion(jag, sir, w, P, false).contour, sir)).toBeLessThan(1e-9);
  });

  it("torso de jaguar con cola de sirena: solo la punta cambia y la procedencia lo dice", () => {
    const h = blendByRegion(jag, sir, { punta: 1 }, P);
    expect(h.contour.points.length).toBe(jag.points.length);
    expect(h.provenance.regions.map((r) => r.from)).toEqual(["jaguar", "jaguar", "sirena", "jaguar"]);
    expect(h.provenance.safety).toMatchObject({ crossingsAtRequest: 0, factor: 1, relaxed: false });
    for (const k of [0, 1, 3]) expect(regionSlice(h.contour, k)).toEqual(regionSlice(jag, k).map((p) => [expect.closeTo(p[0], 9), expect.closeTo(p[1], 9)]));
    expect(regionSlice(h.contour, 2)).not.toEqual(regionSlice(jag, 2));
  });

  it("un híbrido que se cruza al peso pedido baja el peso de forma determinista hasta no cruzarse y lo dice", () => {
    const h = blendByRegion(contour("jaguar"), contour("mano"), { cabeza: 1 }, P);
    expect(h.provenance.safety!.crossingsAtRequest).toBeGreaterThan(0);
    expect(h.provenance.safety!.relaxed).toBe(true);
    expect(h.provenance.safety!.factor).toBeLessThan(1);
    expect(h.provenance.regions[0].weight).toBe(h.provenance.safety!.factor);
    expect(isSimple(h.contour.points)).toBe(true);
    expect(blendByRegion(contour("jaguar"), contour("mano"), { cabeza: 1 }, P)).toEqual(h);
  });

  it("ningún par de motivos en ninguna región entrega un contorno que se cruza", () => {
    const bad: string[] = [];
    for (const a of MOTIF_IDS) for (const b of MOTIF_IDS) for (const r of REGIONS) {
      if (a !== b && !isSimple(blendByRegion(contour(a), contour(b), { [r]: 1 }, P).contour.points)) bad.push(`${a}+${b}@${r}`);
    }
    expect(bad).toEqual([]);
  });

  it("es determinista", () => {
    const w = { cabeza: 0.3, punta: 1 };
    expect(blendByRegion(contour("perro"), contour("mano"), w, P)).toEqual(blendByRegion(contour("perro"), contour("mano"), w, P));
  });

  it("rechaza particiones distintas", () => {
    expect(() => blendByRegion(jag, motifContour(MOTIFS.sirena, N + 1), {}, P)).toThrow();
  });
});

describe("caricature (Brennan 1982) con norma por familia", () => {
  it("cada motivo cae en su familia: animales, caras, objetos", () => {
    expect(MOTIF_IDS.map((id) => familyOf(id, P))).toEqual(MOTIF_IDS.map((id) => (["perro", "jaguar", "sirena"].includes(id) ? "animales" : ["mascara", "craneo", "ojo"].includes(id) ? "caras" : "objetos")));
    expect(familyNorm("jaguar", P).id).toBe("norma:animales");
    expect(familyNorm("jaguar", P).points.length).toBe(REGIONS.length * N);
  });

  it.each(MOTIF_IDS)("%s: k=1 es la identidad", (id) => {
    expect(maxDist(caricature(contour(id), familyNorm(id, P), 1, P).contour, contour(id))).toBeLessThan(1e-9);
  });

  it("k>1 aleja de la norma y k=0 la alcanza", () => {
    const f = contour("perro"), norm = familyNorm("perro", P);
    const d = (c: RegionContour) => maxDist(c, exaggerate(f, norm, 0, 0));
    expect(d(caricature(f, norm, 1.6, P).contour)).toBeGreaterThan(d(f));
  });

  it("la norma de familia con paso bajo deja exagerar a k=2 sin cruce a siete motivos; la mancha de los ocho, sólo a las caras y al perro", () => {
    const blob = motifNorm(all(), P.normIterations);
    const reaches = (norm: (id: string) => RegionContour, w: number) => MOTIF_IDS.filter((id) => isSimple(exaggerate(contour(id), norm(id), 2, w).points));
    expect(reaches(() => blob, 0)).toEqual(["ojo", "craneo", "perro", "mascara"]);
    expect(reaches((id) => familyNorm(id, P), P.smoothing)).toEqual(MOTIF_IDS.filter((id) => id !== "sirena"));
  });

  it.each(MOTIF_IDS)("%s: ninguna k del rango se autocruza; si la pedida se cruza, baja hacia 1 y lo dice", (id) => {
    for (const k of [1.5, 2, 2.5]) {
      const c = caricature(contour(id), familyNorm(id, P), k, P);
      expect(isSimple(c.contour.points)).toBe(true);
      expect(c.provenance.k).toBeLessThanOrEqual(k);
      expect(c.provenance.safety.relaxed).toBe(c.provenance.k < k);
      if (c.provenance.safety.relaxed) expect(c.provenance.safety.crossingsAtRequest).toBeGreaterThan(0);
    }
  });

  it("la caricatura de un híbrido usa la norma de la familia de la base y la etiqueta lo cuenta todo", () => {
    const r = morphMotif("jaguar", { with: "sirena", weights: { punta: 1 }, k: 1.8 }, P);
    expect(r.label).toMatch(/^jaguar⊕sirena\[punta 1\]~k/);
    expect(r.caricature!.norm).toBe("norma:animales");
    expect(isSimple(r.contour.points)).toBe(true);
  });

  it("es determinista", () => {
    expect(motifNorm(all(), P.normIterations)).toEqual(motifNorm(all(), P.normIterations));
    expect(caricature(contour("jaguar"), familyNorm("jaguar", P), 1.5, P)).toEqual(caricature(contour("jaguar"), familyNorm("jaguar", P), 1.5, P));
  });
});
