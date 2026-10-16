# friedeberg — composición arquitectónica procedural (neobarroco kitsch)

Estudio de los principios estéticos de Pedro Friedeberg sin copiar ninguna obra: templos, cúpulas, columnas, arcos y mosaicos
construidos sólo con vectores y geometría. Cero imágenes generadas por IA.

## Dónde vive el código

Desde 2026-10-15 el generador es el subsistema `web/src/graphics/` (mapa de capas en `web/src/graphics/CLAUDE.md`):

- Gramática en metros: `graphics/domain/architecture/` (`buildArchitecture`, `buildColonnade`). Los esquemas ornamentales de cada columna, arco, cúpula y entablamento son datos del modelo, no decisiones del dibujo.
- Motivos ornamentales: `graphics/domain/motifs/` (greca, chevrón, hélice salomónica, abanico, roseta, volutas, Sierpinski, dovelaje, arcos anidados, anillo apuntado, sigilos). Puros, emiten `Shape[]`, LOD por `shows(px)`.
- Composición 2D: `graphics/application/compose.ts` (`composeIllustration(config)` → `DisplayList` por capas) y `application/facade/*` (un pintor por elemento). Proyección en `application/projection.ts` (perspectiva de un punto o alzado).
- Serialización: `graphics/renderers/svg/serialize.ts` (`toSvg`). El mismo `DisplayList` lo pinta Canvas 2D y lo rasteriza Three.js como textura.
- Configuración: `graphics/config/` (`ArtConfig`/`TechConfig`, paletas, presets `sparse|base|dense|noche|elevation`, `resolveConfig` valida en la frontera).
- Canvas 2D: `graphics/renderers/canvas/paint.ts` pinta el mismo `DisplayList` (arcos convertidos a centro, sin `Path2D`).
- Three.js: `graphics/renderers/three/buildTemple.ts` levanta la `Architecture` en geometría (cilindros, toros, anillos, cajas, esferas); las texturas salen de los mismos pintores de fachada vía `application/textureView.ts`; piso y cúpulas usan GLSL (`renderers/three/shaders/`). El juego lo monta en `web/src/game/Scene.tsx` al norte del laberinto (`config/composition.ts`).
- Vista previa en el navegador: `npm run dev` en `web/` y `/laberinto.html?view=graphics&preset=dense&backend=svg|canvas|three`.
- Capturas de referencia: `capturas/` (`dense-svg.jpg`, `dense-canvas.jpg`, `dense-three.jpg`, `game-temple-north.jpg`).
- Tests: `web/src/graphics/**/*.test.ts` (`npx vitest run src/graphics` desde `web/`).
- Render a disco: `node render.ts --preset=dense` o `node render.ts --seed=7 --density=0.6 --complexity=3 --palette=friedeberg --symmetry=bilateral` (Node 24 corre TS sin build). Sale en `out/` un `.svg` y un `.scene.json` con la `Architecture`.

## Arquitectura: gramática en metros → proyección → DisplayList → SVG | Canvas | Three

`buildArchitecture(art, rng)` produce el modelo en metros (columnas con `x, z, h, r, shaft, capital`; arcos con `x0, x1, y, r, gallery, voussoirs`; cúpula con `ribs, tiers, windows`; piso con `tile`).
Nada ahí sabe de píxeles. `makeView(tech, z)` es la única proyección; los pintores de `facade/` reciben la vista y el modelo y emiten formas 2D que cualquier backend serializa.
Three.js reusa `buildArchitecture` tal cual: columna → `CylinderGeometry`, cúpula → `SphereGeometry(thetaLength = π/2)`, arco → `TorusGeometry(arc = π)`,
piso → `PlaneGeometry` con shader de tablero. El `.scene.json` es el contrato.

## Principios matemáticos y compositivos

| Principio | Dónde |
|---|---|
| Perspectiva de un punto de fuga: `sx = cx + x·f/z`, `sy = hy + (camH − y)·f/z` | `makeView`, piso proyectado tile por tile |
| Simetría bilateral: columnas en `±k·spacing`, cúpula y sol en el eje | `buildScene`, columnas impares (5/7/9) |
| Simetría rotacional de orden n: rayos del sol, nervaduras de la cúpula, rosetas | `drawSun`, `domeTier`, `drawFrame` |
| Teselación por traslación: tablero con alternancia de paridad `(xi + zi) mod 2` | `drawPattern` |
| Espiral logarítmica `r = a·e^{bθ}` para las volutas de los capiteles | `logSpiralPoints`, `drawColumn` |
| Filotaxis (ángulo áureo 137.5°, `r ∝ √k`) para repartir estrellas sin cúmulos | `drawStars` |
| Dovelaje: n cuñas en coordenadas polares entre `rIn` y `rOut`, n impar para clave central | `drawArch` |
| Autosimilitud: la linterna de la cúpula es otra cúpula a escala 0.42, `tiers` veces | `drawDome` |
| Jerarquía por capas (fondo → cielo → piso → plataforma → cúpula → arcos → columnas → entablamento → marco) | `renderFriedeberg` |

## Parámetros

`seed` (reproducible), `density` 0..1 (estrías, bandas, diamantes del piso, festones), `complexity` 1..5 (dovelas, arcos anidados, pisos de cúpula, rosetas),
`horizon`, `focal`, `camHeight`, `columns`, `palette` (`friedeberg` crema/magenta/turquesa/ocre, `noche` sobre negro con el verde de CRISTAL).

## Gramática v2 (2026-10-15)

- **Tres escalas por módulo.** Escala 1: colonnade (columnas, arcos, cúpula, entablamento). Escala 2: cada columna lleva bandas de chevrón alternadas con estrías, cada capitel volutas y roseta, cada dovela un rombo. Escala 3: la clave lleva roseta con puntos, la voluta lleva espiral interior, el chevrón lleva puntos. Cada escala se dibuja sólo si su tamaño proyectado pasa `visible(px, min)`: eso es LOD y es lo que evita el ruido.
- **Sin vacíos.** Cada arco abre una galería: `complexity` niveles de arcos a profundidades `z + k·1.1·spacing`, con muros laterales en perspectiva (cuadriláteros que convergen al punto de fuga), nervaduras que unen arco exterior e interior, líneas de piso proyectadas, ventanitas en los muros y, al fondo, abanico + roseta. Entre arcos y entablamento hay un muro con abanicos en las enjutas y una fila de ventanas ciegas.
- **Repetición con anomalías.** `anomalyRate` decide por seed: una columna salomónica (`helixBand`), un arco apuntado (`pointedRingPath` + arcos anidados), una ventana estrella, un triglifo invertido. La simetría global se conserva; la local se rompe en un módulo.
- **Profundidad en fachada, no sólo en piso.** Sofito del entablamento con casetones proyectados (`view.project` a `z` y `z + depth`), escalones con cara superior y frontal, alas laterales a `z + 7` con cara lateral visible, galerías interiores.
- **Autosimilitud estructural.** Las alas son la misma `Colonnade` con 3 columnas y `spacing·0.8`; la linterna es otra cúpula a 0.42; el sol lleva un Sierpinski de profundidad `complexity`; las rosetas se repiten en capitel, clave, friso y esquinas del marco.
- **Paleta.** Magenta y turquesa bajados de saturación, crema de muro distinto del fondo, línea de tinta en todo. La sofisticación va en la línea, no en el color.

## Edificio computacional v0 (2026-10-15): un modelo, cinco vistas

Prueba de concepto arquitectónica, sin ornamento, que cierra el criterio de éxito «si se mueve una puerta en el modelo, se mueve en planta, alzado, sección, axonometría y escena navegable». Auditoría y ruta: `auditoria-gramatica-arquitectonica.md`.

- Programa espacial y layout: `web/src/graphics/config/programs.ts` (`CLOISTER_PROGRAM`, `CLOISTER_LAYOUT`): patio, cuatro galerías, cuatro torres de esquina, vestíbulo y ocho salas; adyacencias con tipo de acceso (`door` | `arch` | `open`).
- Planta: `domain/architecture/plan.ts` deriva muros de las aristas compartidas entre rectángulos y coloca huecos por adyacencia; `openingOverrides[pairKey(a,b)].at` mueve una puerta.
- Validación: `domain/architecture/validate.ts` separa **geométrica** (solape, cobertura exacta del footprint, huecos dentro del muro), **arquitectónica** (toda adyacencia realizada, BFS desde el exterior, patio cerrado por galerías, torres en esquinas, proporciones como advertencia) y **estructural** (`not-evaluated`: no existe cálculo de cargas ni luces; nada aquí certifica edificabilidad).
- Volumetría: `domain/architecture/mass.ts` → sólidos convexos con normales y winding coherentes (muros partidos en dintel/antepecho alrededor de cada hueco, losas, pirámides de torre).
- Proyección: `application/projector.ts` (planta, alzados, isométrica, dimétrica, caballera, gabinete, militar, cónica) con matrices propias column-major; `renderers/three/building/camera.ts` las copia a una cámara de Three y el test exige igualdad en NDC con `Vector3.project`.
- Láminas: `application/drawings/{plan,elevation,section,axonometric}.ts` emiten la misma `DisplayList` que `toSvg`; corte real por plano (`domain/math/clip.ts`), poché, painter's por sólido (no es eliminación exacta de líneas ocultas; límite conocido).
- Render a disco: `node i+d/friedeberg/render-building.ts [--door=0.2]` → `out/building/*.svg` + `building.json` + `validation.json`.
- Página navegable: `npm run dev` y `http://localhost:5173/building.html` (slider de puerta, botones que montan la cámara desde el mismo `Projector`; la sección 3D usa `clippingPlanes`, que recorta sólo el render).
- Evidencia: `capturas/building-*.png` y `capturas/building-page-door0.2.jpg`.

Siguiente: órdenes clásicos (`config/orders.ts` con las cifras de Vignola citadas en la auditoría), arcos de dos centros en la arcada, ornamento por cara con uv, anomalías con traza.
