# friedeberg — composición arquitectónica procedural (neobarroco kitsch)

Estudio de los principios estéticos de Pedro Friedeberg sin copiar ninguna obra: templos, cúpulas, columnas, arcos y mosaicos
construidos sólo con vectores y geometría. Cero imágenes generadas por IA.

## Dónde vive el código

- Generador: `web/src/game/friedebergSvg.ts` (TypeScript, junto a `glyphSvg.ts`, el generador de sellos de CRISTAL).
- Primitivas compartidas: `web/src/game/svgPrimitives.ts` (RNG `mulberry32`, polígonos, radiales, concéntricos, flor de la vida, espiral logarítmica, estrellas).
- Motivos ornamentales: `web/src/game/ornamentMotifs.ts` (greca, chevrón, hélice salomónica, abanico, roseta, volutas, Sierpinski, dovelaje, arcos anidados, anillo apuntado). Puros, en espacio de pantalla, con `level` y gate `visible(px)`.
- Test: `web/src/game/friedebergSvg.test.ts`.
- Render a disco: `node render.ts --seed=7 --density=0.6 --complexity=3 --palette=friedeberg` (Node 24 corre TS sin build). Sale en `out/` un `.svg` y un `.scene.json`.

## Arquitectura: escena en unidades de mundo → proyección → SVG

`buildScene(cfg, rng)` produce una escena en metros (columnas con `x, z, h, r`; arcos con `x0, x1, y, r`; cúpula con `x, z, y, r, ribs`; piso con `tile`).
Nada ahí sabe de píxeles. `makeView(cfg)` es la única capa que proyecta (perspectiva de un punto de fuga); los `draw*` reciben la vista y la escena.
Para pasar a Three.js se reusa `buildScene` tal cual: columna → `CylinderGeometry`, cúpula → `SphereGeometry(thetaLength = π/2)`, arco → `TorusGeometry(arc = π)`,
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
