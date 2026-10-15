# web/src/graphics — una gramática, varios medios

Subsistema gráfico procedural del juego. Cero imágenes generadas por IA: todo sale de geometría,
matemáticas y semillas deterministas. Sustituye a los antiguos `game/friedebergSvg.ts`,
`game/ornamentMotifs.ts`, `game/svgPrimitives.ts` y `game/glyphSvg.ts` (borrados el 2026-10-15;
no restaurarlos: sus equivalentes están abajo).

## Capas (las dependencias apuntan hacia abajo; `layering.test.ts` lo vigila)

| Capa | Carpeta | Responsabilidad | Puede importar |
|---|---|---|---|
| Domain | `domain/` | `rng` (mulberry32, también lo usa `game/maze.ts`), `shapes` (IR 2D: `Shape`, `DisplayList`, `Style`), `geometry` (polígonos, estrellas, espirales, arcos → `Vec2[]`), `lod` (`visible`, `makeLod`, `lodLevel`), `motifs/*` (greca, chevrón, hélice, abanico, roseta, volutas, Sierpinski, dovelas, arcos, sigilos → `Shape[]`), `architecture/*` (gramática en metros: `Architecture`, `Colonnade`, `Column.shaft`, `Arch.gallery`…) | sólo `domain/` y tipos de `config/` |
| Config | `config/` | `palettes`, `types` (`ArtConfig` vs `TechConfig`), `presets` (sparse/base/dense/noche/elevation), `validate` (`resolveConfig` clampa y lanza `ConfigError`) | `domain/lod` (tipo) |
| Application | `application/` | `compose.ts` (config → `Architecture` → `DisplayList` por capas), `projection.ts` (`makeView`: perspectiva de un punto o alzado), `painter.ts`, `facade/*` (un pintor por elemento, emiten `Shape[]`), `glyph.ts` (sellos de arquetipo) | `domain/`, `config/` |
| Renderers | `renderers/` | `svg/serialize` (`toSvg`), `svg/glyph` (data URI para `game/RitualGlyph.tsx`), `pathData` (mini-lenguaje de path compartido por SVG y Canvas `Path2D`), `canvas/`, `three/` | todo lo anterior, `three`, DOM |
| Presentation | `presentation/` | componentes dumb (props in, píxeles out) | todo |

## Reglas

- Los motivos y la gramática no saben de píxeles de salida ni de backend. La proyección es la única
  capa que convierte metros en píxeles; los pintores de `facade/` deciden LOD con `lod.shows(px, min)`.
- Una decisión que cambia QUÉ se construye (cuántas dovelas, qué fuste, cuántos niveles de galería) vive
  en `domain/architecture/`, no en un pintor. Un pintor sólo decide cómo se ve a ese tamaño.
- Los parámetros artísticos (`seed`, `density`, `complexity`, `anomalyRate`, `palette`, `symmetry`,
  `columns`) van en `ArtConfig`; los técnicos (`width`, `height`, `projection`, `lod`, `renderBackend`,
  `shaderPreset`) en `TechConfig`. Un preset es un `ConfigInput` reproducible.
- Paridad visual: `i+d/friedeberg/out/*.svg` son las tres variantes de referencia
  (`node i+d/friedeberg/render.ts --preset=sparse|base|dense`). Un cambio en `facade/` o `motifs/`
  se compara pixel a pixel en Chrome antes de commitear.
- Imports relativos con extensión `.ts` dentro de `graphics/` para que Node 24 ejecute `render.ts`
  sin build.
