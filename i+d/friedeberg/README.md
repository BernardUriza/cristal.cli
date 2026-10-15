# friedeberg — composición arquitectónica procedural (neobarroco kitsch)

Estudio de los principios estéticos de Pedro Friedeberg sin copiar ninguna obra: templos, cúpulas, columnas, arcos y mosaicos
construidos sólo con vectores y geometría. Cero imágenes generadas por IA.

## Dónde vive el código

- Generador: `web/src/game/friedebergSvg.ts` (TypeScript, junto a `glyphSvg.ts`, el generador de sellos de CRISTAL).
- Primitivas compartidas: `web/src/game/svgPrimitives.ts` (RNG `mulberry32`, polígonos, radiales, concéntricos, flor de la vida, espiral logarítmica, estrellas).
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
