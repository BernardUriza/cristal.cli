# web/src/graphics — una gramática, varios medios

Subsistema gráfico procedural del juego. Cero imágenes generadas por IA: todo sale de geometría,
matemáticas y semillas deterministas. Sustituye a los antiguos `game/friedebergSvg.ts`,
`game/ornamentMotifs.ts`, `game/svgPrimitives.ts` y `game/glyphSvg.ts` (borrados el 2026-10-15;
no restaurarlos: sus equivalentes están abajo).

## Capas (las dependencias apuntan hacia abajo; `layering.test.ts` lo vigila, también ciclos)

| Capa | Carpeta | Responsabilidad | Puede importar |
|---|---|---|---|
| Domain | `domain/` | `rng` (mulberry32, también lo usa `game/maze.ts`), `shapes` (IR 2D: `Shape`, `DisplayList`, `Style`, `Transform` ordenado), `geometry` (polígonos, estrellas, espirales, arcos → `Vec2[]`; `arcFromEndpoints` para Canvas), `lod` (`visible`, `makeLod`, `lodLevel`, `projectedHeightPx`), `motifs/*` (greca, chevrón, hélice, abanico, roseta, volutas, Sierpinski, dovelas, arcos, sigilos → `Shape[]`), `architecture/*` (gramática en metros: `Architecture`, `Colonnade`, `Column.shaft`, `Arch.gallery`…) | sólo `domain/` y tipos de `config/` |
| Config | `config/` | `palettes`, `types` (`ArtConfig` vs `TechConfig`), `presets` (sparse/base/dense/noche/elevation), `validate` (`resolveConfig` clampa y lanza `ConfigError`), `composition` (la composición que monta el juego y dónde) | `domain/lod` (tipo) |
| Application | `application/` | `compose.ts` (config → `Architecture` → `DisplayList` por capas), `projection.ts` (`makeView`: perspectiva de un punto o alzado), `textureView.ts` (vista ortográfica a píxeles de textura: los mismos pintores pintan texturas para Three), `painter.ts`, `facade/*` (un pintor por elemento, emiten `Shape[]`), `glyph.ts` (sellos de arquetipo) | `domain/`, `config/` |
| Renderers | `renderers/` | `pathData` (mini-lenguaje de path compartido), `svg/serialize` (`toSvg`), `svg/glyph` (data URI para `game/RitualGlyph.tsx`), `canvas/paint` (`DisplayList` → `CanvasRenderingContext2D`, arcos por centro), `canvas/rasterize`, `three/buildTemple` (`Architecture` → `THREE.Group` con `dispose()`), `three/materials` (+ `shaders/*.glsl` vía `?raw`: tablero/greca con fog y nervaduras de cúpula), `three/textures` (`DisplayList` → `CanvasTexture`) | todo lo anterior, `three`, DOM |
| Presentation | `presentation/` | `Temple` (R3F dumb: config in, `<primitive>` out, LOD de textura por tamaño proyectado), `CompositionPreview` (svg \| canvas), `GraphicsPreview` (ruta `?view=graphics`) | todo |

Convive aquí la gramática arquitectónica de la otra línea de trabajo (`domain/math/`, `domain/architecture/{program,plan,mass,validate,layout}.ts`,
`application/projector.ts`, `application/drawings/`, `config/{programs,drawings}.ts`, `renderers/three/building/`): mismas capas, mismo test de fronteras.

## Reglas

- Los motivos y la gramática no saben de píxeles de salida ni de backend. La proyección es la única
  capa que convierte metros en píxeles; los pintores de `facade/` deciden LOD con `lod.shows(px, min)`.
- Una decisión que cambia QUÉ se construye (cuántas dovelas, qué fuste, cuántos niveles de galería) vive
  en `domain/architecture/`, no en un pintor. Un pintor sólo decide cómo se ve a ese tamaño.
- Los parámetros artísticos (`seed`, `density`, `complexity`, `anomalyRate`, `palette`, `symmetry`,
  `columns`) van en `ArtConfig`; los técnicos (`width`, `height`, `projection`, `lod`, `renderBackend`,
  `shaderPreset`) en `TechConfig`. Un preset es un `ConfigInput` reproducible.
- Three no reinventa el ornamento: la textura de un fuste, un muro, un entablamento o un anillo de arco
  es el pintor de fachada correspondiente sobre un `textureView`; los patrones puramente matemáticos
  (tablero, greca, nervaduras) van en GLSL. Todo recurso GPU se registra en el `Builder` y se libera en `dispose()`.
- Paridad visual: `i+d/friedeberg/out/*.svg` son las tres variantes de referencia
  (`node i+d/friedeberg/render.ts --preset=sparse|base|dense`). Un cambio en `facade/` o `motifs/`
  se compara pixel a pixel en Chrome antes de commitear. Vista previa: `npm run dev` y
  `/?view=graphics&preset=dense&backend=svg|canvas|three` (acepta `seed`, `density`, `complexity`,
  `anomalyRate`, `palette`, `symmetry`, `projection`, `shader`, `lod`).
- Imports relativos con extensión `.ts` dentro de `graphics/` para que Node 24 ejecute `render.ts`
  sin build.
