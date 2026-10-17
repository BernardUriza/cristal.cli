# Figuras generativas: que el motor invente figuras en vez de pegar 8 motivos

Status: In progress
Proposed: 2026-10-17 by Bernard («busca más inspiración para algoritmos de más figuras»; /histerical-search, 5 investigadores)

**Qué es.** Hoy ATELIER tiene 8 siluetas Bézier trazadas a mano (ojo, mano, cráneo, perro, jaguar, escalera, máscara,
sirena) y criaturas de 6 ranuras que son collage. Veredicto: **la figura legible sale de una estructura (esqueleto o grafo
de partes) y el carácter de una deformación; la hibridación legible exige correspondencia semántica, no interpolación
global.** Cero IA generativa de imágenes en todo lo de abajo (regla dura 1); el LLM decide recetas, el código la geometría.

## Hallazgos (certeza y fuentes)

| # | Técnica | Qué da | Certeza | Fuentes clave |
|---|---|---|---|---|
| 1 | Grafo de partes tipadas con sockets, recursión acotada, presupuesto y simetría como flag de arista | Criaturas NUEVAS, coherentes, reproducibles | PROBABLE | Sims 1994 (gpbib.pmacs.upenn.edu/gp-html/alife94_sims.html, karlsims.com), Hecker sobre los rigblocks de Spore (chrishecker.com/My_Liner_Notes_for_Spore), `ChimericWeight` en Bodies.xml de Caves of Qud (wiki.cavesofqud.com/wiki/Chimera) |
| 2 | Esqueleto paramétrico → cápsulas de radio desigual por hueso → unión booleana de polígonos | Cuerpos humanos y animales cerrados, sin autointersecciones | PROBABLE | Quilez `sdUnevenCapsule` (iquilezles.org/articles/distfunctions2d), polygon-clipping MIT (github.com/mfogel/polygon-clipping), perfect-freehand MIT (github.com/steveruizok/perfect-freehand), Hsu y Lee «Skeletal Strokes» SIGGRAPH 94 |
| 3 | SDF por hueso + smooth-min + marching squares | Quimeras que se funden orgánicamente | PROBABLE (la página de smin dio 404; fórmula por snippets coincidentes) | Quilez distfunctions2d, d3-contour, Wikipedia marching squares |
| 4 | Canon humano de 8 cabezas (7.5 promedio, 9 heroico) | Proporciones parametrizables | CONFIRMADO | Wikipedia Body proportions, thedrawingsource, método Loomis |
| 5 | Canon animal | — | NO ENCONTRADO: tablas propias como config tipada | contradicciones entre tutoriales |
| 6 | Morphing por anclas semánticas + remuestreo por arco + mezcla POR REGIÓN | Híbridos legibles (torso de A, cola de B) y caricatura (norma + k·(f − norma)) | PROBABLE (síntesis del investigador) | flubber (github.com/veltman/flubber), Alexa-Cohen-Or-Levin ARAP SIGGRAPH 2000, Brennan MIT 1982 (caricatura) |
| 7 | Teselas isoédricas (Escherization) | Figuras que llenan el plano, figura-fondo, frisos | CONFIRMADO (librería) | tactile-js BSD-3 de Kaplan (github.com/isohedral/tactile-js, npm tactile-js@1.0.0), Koizumi-Sugihara 2011 (autovalores, sirve con no convexas; ar5iv 2011.10175, arXiv 1912.09605) |
| 8 | Ornamento floral sin solapes (rinceaux, grutescos) | Zarcillos que llenan cualquier contorno | PROBABLE | Wong-Zongker-Salesin SIGGRAPH 98, Lingdong Huang MIT Media Lab (Poisson + Voronoi + Lloyd + DFS) |
| 9 | Flow fields, deformación recursiva de polígono, crecimiento diferencial, 1 % de desorden | Carácter: pelo, pliegues, bordes orgánicos, simetría interrumpida | PROBABLE (casi todo es abstracto en las fuentes, no figurativo) | Tyler Hobbs (tylerxhobbs.com/words/flow-fields, ensayo de acuarela 2017), Hoff vía repost (inconvergent dio 403), Vera Molnár (dam.org Interruptions) |
| 10 | Rostros paramétricos (Chernoff, avatares por partes con semilla FNV-1a + Mulberry32) | Caras variadas con 10–18 parámetros | PROBABLE | Wikipedia Chernoff face, dicebear.com |

**Huecos declarados:** no se leyeron en fuente primaria el PDF de Sims (campos de conexión y reflejo), el smin de Quilez
(404), los PDFs de Kaplan 2000/2008/2019, el ensayo de Hoff (403). Sin fuente: Zach Lieberman, Gamboa Naon, Joshua Davis,
No Man's Sky, canon animal. tactile-js no trae tipos TS y npm dice «SEE LICENSE IN LICENSE»: abrir LICENSE antes de usarla.

## Cómo se aplica a CRISTAL

- El grafo de partes (1) **reemplaza** el plan corporal fijo de 6 ranuras de `domain/motifs/figures/creature.ts`: los
  roles estructurales y anclas que ya existen (`parts.ts`) son los sockets; las sustituciones T1–T4 son aristas híbridas
  anatomía→arquitectura. Es la misma idea que la gramática arquitectónica R1–R6: una gramática, dos dominios.
- El esqueleto con cápsulas + unión (2) es la primera fuente de siluetas NUEVAS sin dibujar a mano: humanos con canon de
  cabezas, cuadrúpedos con tablas propias. Requiere `polygon-clipping` (dependencia nueva: decisión de Bernard).
- La mezcla por región (6) da los híbridos de Friedeberg sobre las 8 siluetas existentes: anclas compartidas (cabeza,
  tronco, extremidad, punta) en cada motivo.
- tactile-js (7) da frisos y pisos de figuras encajadas (jaguares que llenan el suelo del patio) y la metamorfosis.
- Hobbs/Molnár (9) entran como capa de carácter dentro de cualquier silueta (pelo, plumaje, 1 % de ruptura).

## Orden propuesto

1. Grafo de partes con sockets sobre `parts.ts` + validador (sin dependencias nuevas).
2. Esqueleto → cápsulas → unión booleana (`polygon-clipping`).
3. Anclas semánticas + mezcla por región + caricatura sobre las 8 siluetas.
4. Teselas isoédricas con tactile-js (frisos y suelos).
5. Flow field de relleno y 1 % de desorden como carácter.

**Decisión de Bernard.** Agregar `polygon-clipping` (MIT) y `tactile-js` (BSD-3, verificar LICENSE) como dependencias.

**Next.** 2026-10-17: pasos 1, 3 y 5 en curso en tres worktrees paralelos (sin dependencias nuevas); 2 y 4 esperan la decisión de dependencias.
