# Gramática estética procedural (capa sobre el motor Three.js)

Status: In progress (gramática, cuatro backends y vista previa Done; faltan los dos pendientes visuales y las 20 variaciones)
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Pipeline IA conversacional → motor de decisiones → gramática visual → renderizador
vectorial [218]; habitación como JSON con seed (`rendering.generativeImages: false`) [218]; una gramática,
múltiples renderizadores, dominio sin saber de renderizadores, módulos 40–120 LOC, config tipada
(`seed, density, complexity, anomalyRate, palette, symmetry, projection, lod, renderBackend`) [230];
tres operaciones programables: hibridación, variación, acumulación [216]; biblioteca de motivos y
reglas artísticas, no aleatoriedad ("protector de pantalla genérico") [218]; versionar cuadros con la
misma seed [226]. ChatGPT, adoptado por Bernard en [229].

**Ya aterrizado (2026-10-15 → 2026-10-17, reportado 2026-10-17).**

| Commit | Qué dejó |
|---|---|
| `595de0f` | Primer generador SVG del templete (`friedebergSvg.ts`, 381 LOC) y carpeta `i+d/friedeberg/` con `render.ts` a disco. |
| `4ca40ec` | Gramática v2: ornamento en tres escalas con LOD por tamaño proyectado, galerías en perspectiva detrás de cada arco, anomalías por seed (columna salomónica, arco apuntado, ventana estrella, triglifo invertido), sofito con casetones, alas autosimilares. |
| `5ada384` | Auditoría del motor y ruta incremental hacia gramática arquitectónica computacional (`i+d/friedeberg/auditoria-gramatica-arquitectonica.{md,html}`). Ese commit borró el generador por arrastre del índice; `e655ef8` lo restauró. |
| `76846a8` | Refactor a capas en `web/src/graphics/`: `domain/` (rng, shapes, geometry, lod, motifs, architecture en metros), `config/` (`ArtConfig`/`TechConfig`, paletas, presets, `resolveConfig`), `application/` (compose, projection, un pintor por elemento de fachada), `renderers/svg`. `layering.test.ts` vigila que las dependencias apunten hacia abajo y que no haya ciclos. Los cuatro archivos viejos de `game/` quedaron borrados y repuntados. |
| `8b10294` | Mismo `DisplayList` pintado por Canvas 2D (`renderers/canvas/paint.ts`) y levantado por Three.js (`renderers/three/buildTemple.ts`: cilindros, toros, esferas; texturas por los mismos pintores vía `textureView.ts`; GLSL para tablero del piso y nervaduras de cúpula). Vista previa `/laberinto.html?view=graphics&preset=…&backend=svg\|canvas\|three`. El templo se monta en el laberinto al norte (`config/composition.ts`, `Scene.tsx`). Capturas: `i+d/friedeberg/capturas/dense-{svg,canvas,three}.jpg`, `game-temple-north.jpg`. |
| `3826e99`, `74e47ef` | El memorama usa la gramática como arte de cartas (`web/src/memorama/cardArt.ts`), con pares que difieren en ≥2 rasgos de la firma (paleta, complejidad, proyección, simetría, densidad). |
| `53d4178` | El RNG sembrado sube a `shared/` para que el terminal no dependa de `graphics/`. |

Recibos 2026-10-17: `npx vitest run src/graphics src/memorama` → 18 archivos, 75 tests verdes.
Prod (`https://cristal.bernarduriza.com`): `/laberinto.html` 200 y su bundle lleva los uniforms de los
shaders del templo (`uRibs`, `uPrimary`); `/memorama.html` 200. Mapa de capas y reglas:
`web/src/graphics/CLAUDE.md`; principios matemáticos y parámetros: `i+d/friedeberg/README.md`.

**Canónico a reusar.** `web/src/graphics/` — ya existe la separación de capas; no crear otra.

**Decisión de Bernard.** Ninguna abierta; es ejecución.

**Next.** Los dos pendientes visuales del templete (ventanitas de la galería se leen como píldoras; sofito
con casetones se confunde con un segundo friso [229]); 20 variaciones del mismo templete con una
gramática [224].
