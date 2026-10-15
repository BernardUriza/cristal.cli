# Auditoría: del generador de fachadas a una gramática arquitectónica computacional

Fecha: 2026-10-15. Alcance: `web/src/game/friedebergSvg.ts`, `ornamentMotifs.ts`, `svgPrimitives.ts`, lo reusable del juego 3D (`maze.ts`, `mazeGraph.ts`, `RoomScene.tsx`, `proceduralPbrTextures.ts`, `RitualGlyph.tsx`) y `i+d/terminal-2d-basico`.
Pregunta: ¿qué del motor actual ya soporta "un modelo geométrico → planta, alzado, sección, axonometría y vista navegable" y qué falta?

## 1. Lo que ya existe y se conserva

| Pieza | Qué hace hoy | Veredicto |
|---|---|---|
| `buildScene(cfg, rng)` | Escena en metros, separada de píxeles: columnas `{x,z,h,r}`, arcos `{x0,x1,z,y,r}`, cúpula, piso, plataforma, alas | **Se conserva como semilla del modelo**, pero es una *escena de fachada* (lista de colonnades), no un edificio: no hay planta, muros, habitaciones ni estructura. Pasa a ser una *vista derivada* del modelo nuevo. |
| `View.project(x,y,z) → [sx,sy]` | Único punto de proyección (perspectiva de un punto de fuga) | **Es exactamente la costura correcta.** El proyector se vuelve una interfaz `Projector` con implementaciones iso/dimétrica/oblicua/ortográfica/cónica. |
| `facade(view, z)` | Atajo: escala uniforme para un plano frontal a profundidad `z` | **Es la deuda.** Casi todo `draw*` lo usa; asume plano frontal y perspectiva de un punto. Con proyecciones paralelas la escala constante sigue valiendo, con dos puntos de fuga no. Se reemplaza por proyección de polígonos 3D reales. |
| `ornamentMotifs.ts` | Motivos puros en espacio de pantalla con `level` y gate `visible(px)` | **Se conserva íntegro.** Es el LOD. Para Three.js se reusa vía SVG → textura (camino ya existente en `RitualGlyph.tsx`: `glyphSvgDataUri` → `TextureLoader`) o se reescribe en GLSL para los patrones puramente matemáticos (greca, chevrón, tablero). |
| `svgPrimitives.ts` | `mulberry32`, espiral logarítmica, estrellas, flor de la vida | Se conserva. `maze.ts` duplica `mulberry32` en privado: unificar (Art. 6). |
| Anomalías (`anomalyRate`) | `twisted`, `pointed`, `star`, `flipped` elegidas por seed en `buildColonnade` | Embrión correcto: la anomalía vive en el **modelo**, no en el dibujo. Falta que sea una transformación con traza (qué regla, sobre qué elemento, con qué parámetros). |
| Tests (`friedebergSvg.test.ts`) | Determinismo, simetría, anomalías gated, ornamento escala con density/complexity | Se conservan y se extienden con validaciones espaciales. 4/4 verdes hoy. |
| `maze.ts` + `mazeGraph.ts` | Celdas con muros n/s/e/w, BFS `shortestPath`, `connectedNeighbors` | **Reusable para validar conectividad de la planta**: grafo de habitaciones con puertas es el mismo problema. |
| `RoomScene.tsx` | Habitaciones como `boxGeometry` + `planeGeometry`, puertas por `buildDoors` | Patrón 3D existente para "habitación con puertas". No sirve para muros con huecos ni arcos; se sustituye por geometría generada del modelo. |
| `proceduralPbrTextures.ts` | `CanvasTexture` procedural (fbm) para materiales | Camino canónico para ornamento como material en Three.js. |
| `i+d/terminal-2d-basico/index.html` | Terminal HTML con importmap a `three@0.169.0`, sin build | Restricción de compatibilidad: modelo y renderizadores deben ser ESM puros, sin React, cargables por importmap. |
| `render.ts` + `.scene.json` | Node 24 corre TS directo y escribe SVG + escena | Se conserva; el `.scene.json` pasa a ser el modelo completo (`building.json`). |

### 1.1 El refactor paralelo en curso: `web/src/graphics/` (sesión abierta a las 03:04, sin commit todavía)

Otra sesión está migrando el generador a capas (`domain/`, `application/`, `renderers/`, `config/`, ~1300 líneas, 28 archivos) y `render.ts` ya apunta ahí (`composeIllustration` → `toSvg`). Leído sin tocarlo. Qué resuelve y qué no, respecto al pedido:

| Capa nueva | Qué trae | Respecto a la gramática arquitectónica |
|---|---|---|
| `config/types.ts` | `ArtConfig` / `TechConfig` tipados, `ProjectionKind = "perspective" \| "elevation"`, `RenderBackend = "svg" \| "canvas" \| "three"`, `ShaderPreset`, presets, validación | **Cumple** "reglas y parámetros en config tipada". `ProjectionKind` es el lugar donde entran iso/dimétrica/oblicua/sección. |
| `domain/architecture/types.ts` + `build.ts` + `colonnade.ts` | El mismo modelo `Colonnade` de antes con más atributos de detalle (`ShaftScheme`, `voussoirs`, `nestedRings`, `detailLevel`) y `symmetry` | **Sigue siendo escena de fachada**: ni planta, ni muros, ni masas, ni estructura. Es el punto exacto donde se inserta `program → plan → mass → structure`. |
| `domain/geometry.ts`, `domain/shapes.ts` | Primitivas 2D (`Vec2`, `PathSegment`, polígono regular, estrella, espiral, cuña, arco de dos centros `R = 1.3r`) | **Todo es 2D de pantalla.** Falta `Vec3`, `Polygon3D`, matriz 4×4. El arco apuntado usa `1.3r` y `1.25r` a ojo: el de dos centros de §3.3 (`ρ = S/2 + d`) lo sustituye con parámetro con nombre. |
| `domain/lod.ts` | `visible(px)`, `makeLod(detailScale)`, `lodLevel(px, thresholds)` | Se conserva tal cual; sólo cambia quién calcula `px` (tamaño proyectado del polígono 3D). |
| `application/projection.ts` | `makeView(tech, referenceZ)` con `scaleAt(z)`: perspectiva `f/z` o elevación `f/referenceZ`; `facade(view, z)` sigue vivo | **El modo "elevation" es escala constante sobre el mismo dibujo frontal, no una proyección ortográfica del modelo.** Aquí entra el `Projector` matricial de la Fase 0; `facade()` se borra en la Fase 7. |
| `application/painter.ts` + `application/facade/*` | Pintores por elemento (column, dome, opening, wall…) que reciben `Painter = { view, pal, art, lod }` y emiten `DisplayList` | Es la vista de fachada legacy ya aislada: perfecto para envolverla y después igualarla. |
| `renderers/svg/serialize.ts`, `renderers/pathData.ts` | `DisplayList` (rect, path, polygon en píxeles) → SVG | **Renderer tonto, bien.** La DisplayList es 2D: Canvas la consume directo, Three.js sólo como textura. La geometría 3D compartida vive un nivel antes (polígonos 3D → proyector → DisplayList). |
| `presentation/` | Vacía por ahora | Componentes dumb pendientes. |

Conclusión: el refactor paralelo **no se duplica ni se corrige**; la ruta de §4 se monta encima de él. Sus nombres (`domain/architecture`, `application/projection`, `renderers/*`) son los que usa la ruta.

Render actual visto (`out/friedeberg-s7-d0.6-c3.svg`, `s23-d0.9-c5`): fachada frontal con galerías en perspectiva; toda la profundidad es *fingida* por `facade()` a distintas `z` sobre un plano; no hay planta detrás. Es justo lo que Bernard describió como "fachadas que simulan profundidad mediante líneas arbitrarias".

## 2. Lo que falta, por capa del pedido

| # | Capa | Estado | Falta |
|---|---|---|---|
| 1 | Programa espacial | No existe | Tipos `Space`, `Adjacency`; programa del experimento (patio, galería, 4 torres, salas) como config tipada. |
| 2 | Planta | No existe | `Plan`: muros como segmentos con grosor, habitaciones como polígonos, huecos (puertas/arcos) sobre muros, patio como habitación exterior. |
| 3 | Volumetría | Parcial (`h` de columna, `y` de entablamento) | `Mass`: extrusión de cada habitación a su altura, torres como prismas/cilindros, cubiertas (skeleton recto o paramétricas), cúpulas por revolución. |
| 4 | Estructura | Implícita (columnas y arcos sueltos) | `Structure`: apoyos y luces derivados de la planta (vano = distancia entre apoyos), arcos como función del vano, verificación luz/altura. |
| 5 | Proyección | Sólo cónica de un punto | Proyectores paralelos (iso, dimétrica, caballera, militar), ortográficos (planta, alzado, sección), cónica de dos puntos; **una sola matriz** compartida con la cámara de Three.js. |
| 6 | Lenguaje | Proporciones a ojo (`r = spacing·0.125`, `entH = spacing·0.28`) | `orders.ts` con módulos de Vignola/Vitruvio/Palladio citados. |
| 7 | Ornamento sobre superficies reales | En pantalla, por `facade()` | Mapeo motivo → cara del modelo (UV de cada polígono) para que el mismo motivo caiga en SVG y en textura/GLSL. |
| 8 | Transgresión | Flags por seed | `Anomaly` como transformación nombrada `model → model'` con `trace` y test de que la geometría original es recuperable. |
| — | Líneas ocultas / sección | No existe (painter's por capas a mano) | Corte por plano (segmentos → polígonos cerrados → poché) y eliminación de líneas ocultas para SVG. |
| — | Validaciones | Simetría y conteo | Conectividad (BFS sobre habitaciones), no-solape, patio cerrado, torres en esquinas, proporciones dentro del orden, misma geometría en todas las vistas. |

## 3. Qué dice la literatura (7 investigadores, fuentes al final)

### 3.1 Formalismo: CGA shape grammar, implementada en casa
Linaje: Stiny 1971/72 → Wonka 2003 (split grammars) → Müller 2006 (CGA shape, el estándar de facto). Operaciones núcleo: `scope` (caja orientada), `split` por eje con tamaños absolutos/relativos/flotantes `~` y repetición `[*]`, `comp(f|e|v)` (descomponer en caras/aristas/vértices), `extrude`, `roof*`, `offset`, `insert`, consultas de oclusión (`inside/overlaps/touches`, sólo contra sólidos cerrados). Orden grueso→fino: masa → fachada → detalle. **CERTEZA: CONFIRMADA** para la estructura, PROBABLE para la semántica exacta de operadores (el worker no abrió el PDF completo).

Implementaciones JS: `gromgull/cgajs` (Apache-2.0, muerto desde 2017, subconjunto "muy buggy" según su autor, sin `roof*`, `offset`, reglas paramétricas) y `pboechat/ShapeGrammars.js` (sin licencia, 9 commits). **Veredicto: ninguna sirve como dependencia; se escribe un motor split-grammar propio en TS** usando cgajs sólo como referencia de diseño. PROBABLE (la ausencia descansa en pocas búsquedas).

CGA no genera plantas interiores: Müller 2006 hace masa + fachada. Las plantas vienen de otra familia (treemaps, Merrell 2010, gramáticas de planta tipo Palladio/Mies). El diseño sano: gramática de subdivisión sobre el footprint 2D → `extrude` + `comp` estilo CGA.

### 3.2 Planta: el claustro se modela explícito, no se "descubre"
- Squarified treemap (Bruls/Huizing/van Wijk 2000) y su adaptación a plantas (Marson & Musse 2010): rectángulos por área, pasillos añadidos para evitar habitaciones inalcanzables. Tractable (~60-100 líneas). No impone adyacencias.
- Merrell, **Schkufza** & Koltun 2010 (SIGGRAPH Asia): red bayesiana + optimización estocástica. Necesita datos de entrenamiento y ~30 s por layout. **Fuera de alcance**; se toma sólo su arquitectura (programa → búsqueda → función de costo).
- Lopes/Bidarra 2010 "constrained growth": alcanzabilidad garantizada por construcción. Mejor ajuste conceptual.
- **Tipología de claustro (CONFIRMADA, 4 fuentes)**: galería cubierta alrededor de un patio (garth), edificios principales conectados por la galería, antecedente el peristilo romano. Descomposición propuesta por el worker (su inferencia, no un algoritmo publicado): footprint rectangular → patio central → anillo de galería por offset → anillo exterior dividido en 4 bloques de esquina (torres) + 4 bandas laterales subdivididas 1-D → toda habitación toca la galería por su cara interior, luego la puerta va ahí y la conectividad queda garantizada por construcción. ~80 líneas, determinista.
- Validación: grafo de acceso (nodos = habitaciones, galerías, patio, torres, exterior; aristas = puertas) + BFS desde la entrada; métricas de space syntax (profundidad media, RA = 2(MD−1)/(n−2)) como test descriptivo, no oráculo. Chequeos de proporción: aspect ratio, área mínima, suma de áreas = footprint, no solape, ancho de galería consistente con el vano de los arcos.
- Nota del worker: los nombres "Lo & Marmorstein / Peng" que puse en el brief **no existen** en ninguna fuente. Descartados.

### 3.3 Cubiertas y bóvedas
- **Straight skeleton** (Aichholzer et al. 1995; Felkel & Obdržálek 1998): cada cara del esqueleto es un plano de cubierta, `z = pendiente × distancia a la arista origen`. Con un patio (anillo exterior CCW + hueco CW) sale una cubierta a cuatro aguas anular que cae hacia fuera y hacia el patio. Si patio y muro exterior son paralelos y equidistantes, aparece una franja plana degenerada: elegir pendiente y ancho de galería para evitarlo.
- Paquete: `straight-skeleton` v3.0.0 (npm, 2026-03-24, MIT) envuelve **CGAL compilado a Wasm, y el módulo de CGAL es GPL**. Riesgo de licencia no resuelto por ninguna fuente. **Decisión: para el experimento no se toma la dependencia**; la cubierta anular del rectángulo se construye paramétrica (4 alas trapezoidales con juntas en las bisectrices a 45°, que es exactamente el resultado del esqueleto para un rectángulo). El esqueleto general queda como fase posterior si aparecen footprints no rectangulares.
- Cúpulas: hemisferio `(R·sin t, R·cos t)`; apuntada de dos centros con `ρ = S/2 + d` (d=0 semicircular, d=S/2 equilátera); bulbosa sin ecuación canónica (spline por tres tramos: bulbo > tambor, curva ogee, punta). Todo por `LatheGeometry`. Bóveda de arista = `max` de dos cañones ortogonales, bóveda de claustro = `min`; fácil confundirlas en código.
- Three.js r169 (CONFIRMADO leyendo fuente): `ExtrudeGeometry` tiene **bevel activado por defecto** (apagarlo), invierte el contorno si no es CW y sólo normaliza huecos en esa rama → pasar exterior CCW y huecos CW y testear; `ShapeUtils.removeDupEndPts` **muta** los arrays del llamador (pasar copias si el mismo anillo alimenta el SVG). Convención de anillo cerrado opuesta entre el esqueleto (repite el primer vértice) y Three (lo quita): un anillo canónico y conversión en cada frontera.

### 3.4 Proyecciones (la pieza que une todo)
- Isométrica verdadera: ortográfica con elevación `asin(1/√3) = 35.264°`, azimut 45°; `x' = (x−z)/√2`, `y' = y·√(2/3) + (x+z)/√6`; acortamiento 0.8165 en los tres ejes. Forma de dibujante sin escalar: `x' = (x−z)·cos30°`, `y' = y + (x+z)·sin30°`. **Las dos convenciones coexisten: elegir una y usarla idéntica en SVG y Three.**
- "Isométrica" de videojuego 2:1 es **dimétrica** (26.565°, elevación 30°). No etiquetarla isométrica.
- Dimétrica de ingeniería (ISO 5456-3 §5.2 vía fuente secundaria): ejes a ~7°10' y 41°25', escalas 1:1:½ → dirección de vista `d = (1/3, 1/3, √7/3)`, elevación 19.47°, azimut 20.7°. Fórmula general: acortamiento del eje i = `√(1 − dᵢ²)`.
- Oblicuas: `(x,y,z) → (x + k·cosα·z, y + k·sinα·z)`. Caballera k=1, gabinete k=½ (α 45° o 63.4° según texto: parámetro), militar/planométrica = planta rotada en forma verdadera + alturas a escala real. **No afirmar que ISO/DIN definen las oblicuas**: la norma está de paga y sólo se leyó el listado.
- Cónica de dos puntos: yaw θ sin pitch (verticales paralelas), `X = x·cosθ − z·sinθ`, `Z = x·sinθ + z·cosθ`, `sx = f·X/Z`; puntos de fuga en `f·cotθ` y `−f·tanθ`.
- Three.js r169 (CONFIRMADO en fuente): `Matrix4.makeShear(xy, xz, yx, yz, zx, zy)` existe; para oblicua `zx = −k·cosα`, `zy = −k·sinα` (signo negativo porque la cámara mira a −Z), `camera.projectionMatrix = ortho.clone().multiply(shear)` y actualizar `projectionMatrixInverse`; `updateProjectionMatrix()` y el resize **sobrescriben** el override (subclase o re-aplicar). `Vector3.project(camera)` es literalmente `applyMatrix4(matrixWorldInverse).applyMatrix4(projectionMatrix)`, así que honra cualquier override → **un solo par de matrices view/projection en un módulo TS puro alimenta al SVG y a la cámara**. NDC → SVG: `sx = (x+1)/2·W`, `sy = (1−y)/2·H`; `project` no recorta (puntos detrás de la cámara se voltean: clip contra near antes de dibujar); NDC z sirve de profundidad para painter's.

### 3.5 Planta, sección y alzado desde el modelo; 3D → SVG limpio
- Convención: planta = sección horizontal a ~1.2 m (fuentes dan 1.2 m, 4'-0" y 4'-6": **parámetro**, no constante); material cortado en poché; líneas de corte las más gruesas, luego aristas visibles, luego ocultas discontinuas; sección vertical por el eje principal. PROBABLE (páginas de curso, no norma primaria).
- `clippingPlanes` de Three sólo recorta el render. Sección real = intersección plano/triángulo → segmentos → encadenar en polígonos cerrados → poché. `three-edge-projection` trae `PlanarIntersectionGenerator` para eso, pero su `package.json` fija `three ^0.155.0` (no casa con 0.169 sin override). Para un modelo **procedural** la vía limpia es emitir los footprints de muro analíticamente desde la planta: no hace falta cortar mallas.
- `SVGRenderer` **sigue en r169** (`examples/jsm/renderers/SVGRenderer.js`, sin `@deprecated`), painter's algorithm, **sin eliminación de líneas ocultas**. CONFIRMADO.
- Líneas ocultas: `three-edge-projection` (gkjohnson, 2026-06) recorta aristas contra triángulos delante con BVH, expone `visibleEdges/hiddenEdges`, sin exportador SVG, proyecta sólo en Y (rotar el modelo al marco). Alternativa tipo `ln` (fogleman): muestrear aristas y lanzar rayos a la cámara. Para unos cientos de caras ambas son viables; la exacta da salida más limpia.

### 3.6 Lenguaje: proporciones de los órdenes, con números para `config/orders.ts`
Fuente primaria: escaneo de Vignola, *Regola delli cinque ordini* (ed. inglesa 1889, Getty, leída como imagen de láminas), cruzado con el análisis de Zloković/Mitrović, la ficha de Tours y Wikipedia. Módulo **M = radio inferior de la columna** (D = 2M); M se divide en 12 partes (toscano, dórico) o 18 (jónico, corintio, compuesto): **no mezclar sin convertir**.

| Orden | Altura de columna (base+fuste+capitel) | Base | Capitel | Entablamento (= ¼ de la columna) | Arquitrabe / friso / cornisa (M) | Pedestal (≈ ⅓) |
|---|---|---|---|---|---|---|
| Toscano | 14M (7D) | 1M | 1M | 3.5M | 1 / 1⅙ / 1⅓ | 4⅔M |
| Dórico | 16M (8D) | 1M | 1M | 4M | 1 / 1.5 / 1.5 | 5⅓M |
| Jónico | 18M (9D) | 1M | 15/18 M | 4.5M | 1.25 / 1.5 / 1.75 (5:6:7) | 6M |
| Corintio | 20M (10D) | 1M | 2⅓M | 5M | 1.5 / 1.5 / 2 (3:3:4) | 5M 10p |
| Compuesto | 20M (10D) | 1M | como corintio | ≈5M | sólo dibujado | como corintio |

CONFIRMADO para alturas y la regla ¼; PROBABLE para los sub-repartos y la fracción de éntasis. Orden completo con pedestal = 19 partes (4 pedestal : 12 columna : 3 entablamento); sin pedestal 5 partes (4:1). Éntasis: el afinamiento empieza a ⅓ de la altura; diámetro superior ≈ 5/6 del inferior (lectura visual, marcar como tal). Estrías: 20 de arista viva (dórico), 24 semicirculares (jónico, corintio).

**Intercolumnios** (vano libre en diámetros; Vitruvio III.3, Palladio I.XIII): picnóstilo 1.5D, sístilo 2D, éustilo 2.25D con 3D en la crujía central, diástilo 3D, areóstilo > 3D (Vitruvio no da cifra: codificar como rango abierto). Palladio asigna por orden: dórico algo menos de 3D, jónico 2¼D, corintio 2D. Vignola en práctica (vano libre desde sus láminas): toscano ≈2⅓D, dórico 2.75D, jónico 2.25D, corintio ≈2⅓D. Contradicción no resuelta: esbeltez del éustilo 8½D (Gwilt 1826) vs 9½D (Morgan 1914); guardar ambas.

**Arcadas de Vignola** (la galería del experimento sale de aquí): hueco alto = 2 × ancho, semicírculo (flecha = ancho/2); pilar ≈ ⅓ a ½ del hueco; imposta 1M de espesor; clave del arco 1-2M bajo el entablamento. Crujías sin pedestal (M): toscano 6.5 × 13, pilar 3, eje a eje 9.5; dórico 7 × 14 / 3 / 10 (altura total 20M); jónico 8.5 × 17 / 3 / 11.5; corintio 9 × 18 / 3 / 12 (pilar = ⅓ del hueco). Con pedestal: toscano 8¾ × 17½ / 4; dórico 10 × 20 / 5; jónico 11 × 22 / 4; corintio 12 × 25 / 4 (rompe el 2:1 a propósito). Palladio: pilar nunca menos de ⅓ del vano, ½ a ⅔ si pesado, ⅔ en esquinas. Un tercio de cada columna va embebido en el pilar. CONFIRMADO (escaneo primario). Proporción medida de una crujía de claustro real: **no encontrada**; se usa Vignola normalizado (hueco : pilar ≈ 2:1, alto : hueco = 2:1).

**Voluta jónica (Vignola, láminas XIV-XV)**: ojo de 2 partes de diámetro con cuadrado inscrito a 45°; centros de la primera vuelta a 9 arriba, 8 derecha, 7 abajo, 6 izquierda del centro del ojo; vueltas 2 y 3 con centros a ⅓ de la semidiagonal hacia el ojo; 12 cuartos de arco = 3 vueltas; voluta de 16 partes de alto (8 + 2 + 6). PROBABLE en conteo exacto de partes.

**Sin cifras en ninguna fuente** (quedan como parámetros de diseño propios, sin cita): vueltas de la columna salomónica (el "6 vueltas" del brief no se confirmó), proporciones del estípite (sólo la definición de Toussaint: base angosta, obelisco invertido, pirámides y prismas apilados, más ancho al medio), frontón partido, relación tambor/cúpula/linterna de Alberti. Panteón según Palladio: altura interior = diámetro (hemisferio sobre cilindro de igual altura), óculo ≈ 0.19-0.21 del diámetro (aritmética propia sobre las cifras citadas).

### 3.7 Transgresión: figuras imposibles como transformación explícita
- **Elber 2011, "Modeling (Seemingly) Impossible Models"** (Computers & Graphics 35(3), leído de primera mano pp. 1-4): un modelo 3D tangible que se ve contradictorio desde al menos una dirección de vista. Observación 2.1: **una deformación a lo largo de la línea de vista no cambia el dibujo visto desde ese ojo**; en ortográfica sólo cambia Z. Fórmulas: skew global `z' = z + y` (Ec. 1, conserva colinealidad y coplanaridad, rompe ortogonalidad); deformación cónica local `z' = z + √((x−x0)² + (y−y0)²)` (Ec. 2); a lo largo de una línea `z' = z + α / max(d − |L(x,y)|^k, ε)` (Ec. 3). El triángulo de Penrose son 3 barras ortogonales con skew en una. La deformación se restringe por región del plano XY o por sub-objeto. **Es una función pura `model → model'` parametrizada por (dirección de vista, f, máscara por parte): exactamente lo que pide el punto 8.** PROBABLE (Elber de primera mano; Wu y Sugihara sólo por abstracts).
- Wu, Fu, Yeung, Jia, Tang 2010 (ACM TOG 29(2)): partes localmente posibles + optimización de mínimos cuadrados con restricciones por punto de vista, a tasas interactivas. Sólo si se quiere orbitar la cámara con la figura intacta. Mucho más código; no leído completo.
- Sugihara (1982-2015): teoría de interpretación de dibujos de línea; test de realizabilidad como factibilidad lineal (`Aw = 0, Bw > 0`, **no verificado contra el paper primario**: los PDFs no abrieron). Sirve para **validar**, no para generar.
- Consecuencia para el diseño: la anomalía es un pase separado que nunca muta el modelo fuente. Planta, sección y alzado se derivan del modelo **sin deformar**; la axonometría "imposible" se renderiza desde el modelo deformado con la cámara en la dirección que la hace píxel-idéntica a la original, y desde cualquier otra vista revela la deformación. Recalcular normales tras deformar (Elber reporta discontinuidades de sombreado en la costura, Fig. 5). Perspectiva: el paper dice que es extensión simple pero no da fórmula; mover cada vértice sobre su rayo ocular es extrapolación nuestra, hay que testearla.

**Friedeberg, métodos documentados (PROBABLE):** estudió arquitectura en la Ibero desde 1957 hasta tercer año sin terminar; Mathias Goeritz lo empujó al arte (Goeritz: quitar personas del dibujo le da aire metafísico; "cuando añades gente parece proyecto de arquitectura"); sus profesores favorecían la simetría de Mies, él prefería las plantas circulares de Gaudí y dibujaba edificios impracticables; de niño calcaba Canaletto y Piranesi y admiraba las perspectivas de Escher; en sus palabras "un poco Piranesi, un poco Beardsley, un poco Escher"; arquitectos favoritos italianos (Lombardía, Piamonte), Palladio, Gaudí; etiqueta propia "Nintendo Churrigueresque". **NO se encontró ninguna fuente que documente axonometría, isometría, plantas o mapas como método suyo**; un listado de venta (fuente débil) habla de perspectiva de un punto. Los catálogos que lo dirían (retrospectiva Bellas Artes 2009, "La Casa Irracional") no se abrieron. **En los docs del proyecto no se afirma "Friedeberg usaba isométrica"**: se escribe "inspirado en", citando Ibero, Goeritz, Piranesi, Escher, Palladio.

## 4. Veredicto: ruta incremental de integración

Principio: **un modelo, muchos proyectores**. `buildScene` y los `draw*` actuales no se borran el día uno; se envuelven como la "vista de fachada legacy" hasta que la vista nueva los iguale, y entonces se borran (migración termina con borrado, no con shim eterno).

Todas las rutas abajo cuelgan de `web/src/graphics/` (el árbol del refactor paralelo). Nada se crea fuera de él.

Fase 0 — Costura de proyección (sin tocar el dibujo).
`domain/math/mat4.ts` (matriz 4×4 de 16 números, `Vec3`, sin dependencia de `three` para que `2d.cli` lo cargue por importmap) y `application/projection.ts` crece a `Projector = { view, proj, toNdc(p), toScreen(p) }` con fábricas `onePoint`, `twoPoint`, `isometric`, `dimetric`, `oblique(k, α)`, `orthoTop/Front/Side`; `ProjectionKind` en `config/types.ts` pasa de `"perspective" | "elevation"` a la unión completa. Adaptador `renderers/three/camera.ts: toThreeCamera(projector)`. Test: `onePoint` reproduce bit a bit el `makeView(tech, z).project` actual, así el SVG de hoy no cambia ni un byte.

Fase 1 — Programa y planta.
`domain/architecture/program.ts` (tipos `Space`, `Adjacency`, `Program`; el programa del experimento como const tipada en `config/programs.ts`), `domain/architecture/plan.ts` (claustro explícito: patio → galería por offset → 4 torres de esquina + 4 bandas subdivididas; salida `Plan = { rooms, walls, openings, courtyard }` con polígonos en metros), `domain/architecture/validate.ts` (BFS sobre el grafo de accesos reusando la idea de `game/mazeGraph.ts`, no-solape, suma de áreas, patio cerrado, torres en esquinas). Tests por seed.

Fase 2 — Volumetría y estructura.
`domain/architecture/mass.ts` (extrusión de habitaciones y torres, cubierta anular paramétrica de 4 alas, cúpulas por perfil de revolución con las ecuaciones de §3.3), `domain/architecture/structure.ts` (apoyos de la galería a partir del vano, arcos como función del vano con `d` de dos centros, entablamento). Salida: `Building = { plan, masses, structure, surfaces: Polygon3D[] con uv y etiqueta }`. Es el `.building.json`; `Architecture` (la escena de fachada actual) se vuelve una derivación de `Building`.

Fase 3 — Dibujos.
`application/drawings/plan.ts` (corte analítico a `cutHeight`, poché), `elevation.ts`, `section.ts`, `axonometric.ts`: todos reciben `Building` + `Projector` y emiten la **misma `DisplayList`** que ya consume `renderers/svg`, con peso de línea (corte/visible/oculta). Líneas ocultas: primero painter's por NDC z (suficiente para este edificio convexo-anular); `three-edge-projection` como fase posterior si hace falta. `render.ts` emite las cuatro láminas + el json.

Fase 4 — Three.js.
`renderers/three/building.ts`: `ExtrudeGeometry` (bevel off, anillos CCW/CW verificados, copias de arrays), `LatheGeometry` para cúpulas, `BufferGeometry` por cara de cubierta. La cámara sale de `toThreeCamera(projector)`; test de consistencia: proyectar los vértices del modelo con el `Projector` TS y con `Vector3.project(camera)` y exigir igualdad en NDC. `RenderBackend: "three"` deja de ser un string sin implementación.

Fase 5 — Órdenes y ornamento sobre superficies.
`config/orders.ts` (config tipada con las cifras de §3.6: módulo, partes por módulo, alturas, reparto del entablamento, crujías de arcada; los campos sin fuente marcados `unsourced`), `domain/motifs/*` se conservan; `application/ornament.ts`: cada `Polygon3D` lleva marco uv; los motivos se dibujan en uv y se proyectan por polígono (SVG) o se rasterizan a `CanvasTexture`/GLSL (Three). `domain/lod.ts` sigue siendo el LOD, ahora alimentado con el tamaño proyectado del polígono.

Fase 6 — Transgresión con traza.
`domain/architecture/anomaly.ts`: `applyAnomaly(building, rule, rng) → { building', trace }` con dos familias de reglas nombradas. (a) **Anomalías de modelo** (siguen siendo edificios posibles): torre girada, arco apuntado en una sola crujía, galería que cambia de nivel, orden invertido en un módulo; aparecen en las cuatro láminas. (b) **Anomalías de línea de vista (Elber LoSD)**: `z' = z + f(x,y)` en coordenadas de vista, con máscara por parte y `f` de las Ecs. 1-3; la axonometría desde la dirección elegida es píxel-idéntica al modelo sano, cualquier otra vista delata la deformación. Test: `trace` reconstruye el original; para (a) las cuatro láminas de `building'` son coherentes entre sí; para (b) la proyección ortográfica en la dirección de la anomalía iguala a la del modelo sano en NDC (eso prueba que es transformación explícita y no error de proyección).

Fase 7 — Borrado.
Cuando la vista de fachada nueva (Fase 3 + 5 con `onePoint`) iguale lo que hoy hace `composeIllustration`, se borran `facade()`, `application/facade/*` y lo que quede de `game/friedebergSvg.ts`; grep a cero referencias.


## 5. Fuentes consultadas (por investigador)

Gramáticas de forma
1. https://www.doi.org/10.1145/1141911.1141931 — Müller et al. 2006, "Procedural Modeling of Buildings" (CGA shape), ACM TOG 25(3).
2. https://cg.tuwien.ac.at/research/publications/2003/Wonka-2003-Ins — Wonka et al. 2003, "Instant Architecture" (split grammars).
3. https://ideas.repec.org/a/sae/envirb/v7y1980i3p343-351.html — Stiny 1980, "Introduction to shape and shape grammars".
4. https://doc.arcgis.com/en/cityengine/latest/help/help-component-split.htm — Esri CGA: comp split.
5. https://doc.arcgis.com/en/cityengine/latest/cga/cga-inside-function.htm — Esri CGA: consultas de oclusión.
6. https://doc.arcgis.com/en/cityengine/latest/cga/cga-changelog.htm — Esri CGA changelog.
7. https://github.com/gromgull/cgajs y https://gromgull.github.io/cgajs/ — cgajs (Apache-2.0, 2017, subconjunto).
8. https://github.com/pboechat/ShapeGrammars.js — ShapeGrammars.js (sin licencia).
9. https://www.cs.princeton.edu/courses/archive/spring11/cos598A/pdfs/Merrell10a.pdf — Merrell, Schkufza, Koltun 2010.
10. https://dspace.mit.edu/handle/1721.1/39310?show=full — tesis MIT, gramática de plantas de Mies.

Plantas
11. https://diglib.eg.org/items/7e776ce8-0dcb-4818-ab78-831fa73b71bd — Bruls, Huizing, van Wijk 2000, "Squarified Treemaps".
12. https://onlinelibrary.wiley.com/doi/10.1155/2010/624817 — Marson & Musse 2010, plantas por treemap (403, resumen).
13. https://history.siggraph.org/?p=197308 — Merrell et al. 2010, abstract.
14. https://publications.graphics.tudelft.nl/papers/584 — Lopes, Tutenel, Smelik, de Kraker, Bidarra 2010, "Constrained Growth".
15. https://cumincades.scix.net/pdfs/w78-2020-paper-002.pdf — Zhu & McArthur 2020, GA/SA para plantas.
16. https://doi.org/10.3390/app11178229 — Grzesiak-Kopeć et al. 2021.
17. https://arxiv.org/pdf/2008.01803 — GPLAN 2020. https://arxiv.org/pdf/2003.06988 — House-GAN 2020.
18. https://www.britannica.com/topic/cloister — tipología de claustro. https://projects.mcah.columbia.edu/courses/medmil/pages/non-mma-pages/text_links/cloistergarth — Columbia. https://www.gardenvisit.com/history_theory/garden_landscape_design_articles/historic_design_styles/cloister_garden_design_style — forma típica. https://en.wikipedia.org/wiki/Cloister — puntero.
19. https://doi.org/10.3390/su13063394 — síntesis de space syntax (Hillier). https://www.spacesyntax.net/symposia-archive/SSS4/fullpapers/35Campos-Fongpaper.pdf — Campos & Fong.

Cubiertas y bóvedas
20. https://lib.jucs.org/article_preview.php?id=27191 — Aichholzer et al. 1995, straight skeleton. https://publications.ist.tugraz.at/abstracts/aaag-sssp-95/index.html — construcción O(n r log n).
21. https://www.sthu.org/misc/SKRW14/papers/Felkel_1998_StraightSkeletonImplementation.pdf — Felkel & Obdržálek 1998.
22. https://registry.npmjs.org/straight-skeleton y https://github.com/StrandedKitty/straight-skeleton — paquete 3.0.0 (2026-03-24), CGAL/Wasm.
23. https://doc.cgal.org/latest/Manual/packages.html y https://doc.cgal.org/latest/Straight_skeleton_2/index.html — CGAL: licencia GPL del módulo, reglas de entrada.
24. https://en.wikipedia.org/wiki/Groin_vault, https://en.wikipedia.org/wiki/Cloister_vault, https://en.wikipedia.org/wiki/Pointed_arch, https://en.wikipedia.org/wiki/Ogive, https://en.wikipedia.org/wiki/Onion_dome — definiciones.
25. https://raw.githubusercontent.com/mrdoob/three.js/r169/src/geometries/ExtrudeGeometry.js, …/LatheGeometry.js, …/SphereGeometry.js, …/src/extras/ShapeUtils.js — fuente r169.

Proyecciones
26. https://raw.githubusercontent.com/mrdoob/three.js/r169/src/math/Matrix4.js — `makeShear`, `makeOrthographic`. https://raw.githubusercontent.com/mrdoob/three.js/r169/src/math/Vector3.js — `project`.
27. https://en.wikipedia.org/wiki/Axonometric_projection, https://en.wikipedia.org/wiki/Oblique_projection, https://en.wikipedia.org/wiki/Isometric_video_game_graphics.
28. https://lists.w3.org/Archives/Public/public-css-archive/2019Apr/0777.html — post W3C citando ISO 5456-3 (secundaria).
29. https://6sku3uaup9f9.din.de/en/standard/din-iso-5456-3/3357845 — listado DIN ISO 5456-3 (texto de paga, no leído).
30. https://perspectiveresearchcentre.com/dimetric-perspective/ — dimétrica 7°/42°.

Dibujos desde un modelo y 3D → SVG
31. https://smorgasbord.cdp.arch.columbia.edu/modules/13-arch-drawing/13-1_orthographic-drawing — Columbia CDP: corte a 4'-0", poché, pesos.
32. https://openlab.citytech.cuny.edu/christo-arch1101-fall2022/files/2022/09/Architectural-Drawings_Plan-Section-Elevation.pdf — CUNY (snippet).
33. https://github.com/mrdoob/three.js/blob/r169/examples/jsm/renderers/SVGRenderer.js y https://threejs.org/docs/pages/SVGRenderer.html — SVGRenderer vivo en r169.
34. https://github.com/gkjohnson/three-edge-projection y https://raw.githubusercontent.com/gkjohnson/three-edge-projection/main/API.md — líneas ocultas, `PlanarIntersectionGenerator`; https://discourse.threejs.org/t/three-edge-projection-generating-vector-drawings-from-models/92165 (2026-06-11).
35. https://github.com/gkjohnson/three-mesh-bvh, https://github.com/gkjohnson/three-bvh-csg, https://github.com/mfogel/polygon-clipping, https://github.com/fogleman/ln.

Órdenes clásicos
43. http://archive.org/details/fiveordersofarch00vign (copia: https://www.chenarch.com/images/arch-texts/1562-Vignola-Five-Orders.pdf) — Vignola, *The Five Orders of Architecture*, ed. 1889, láminas I-XXIX leídas como imagen.
44. https://www.milanzlokovic.org/wp-content/uploads/2026/01/Branko-Mitrovic_Vignola-and-the-golden-section_Milan-Zlokovic-analysis.pdf — Mitrović sobre Zloković: tabla de Vignola en unidades de intercolumnio.
45. https://architectura.univ-tours.fr/en/livres-auteur/livres-notice/ENSBA_LES64c490 — ficha de Tours: ¼, ⅓, 19 partes.
46. https://en.wikipedia.org/wiki/Classical_order, https://en.wikipedia.org/wiki/Intercolumniation, https://en.wikipedia.org/wiki/Arch, https://en.wikipedia.org/wiki/Solomonic_column, https://en.wikipedia.org/wiki/Estipite.
47. https://www.lexundria.com/vitr/3.3.10/mg, https://lexundria.com/vitr/3.3.7/cf, https://lexundria.com/vitr/3.3/cf — Vitruvio III.3 (Morgan y Gwilt).
48. https://archive.org/stream/andreapalladiosa00pall/andreapalladiosa00pall_djvu.txt — Palladio, Ware 1736, Libro I cap. XIII (resumen, no verbatim).
49. https://emis.muni.cz/journals/NNJ/AndGal.html — volutas de Vitruvio/Alberti/Palladio comparadas.
50. https://digi.ub.uni-heidelberg.de/diglit/sheraton1793/0237 — Sheraton 1793 (sistema de 5 partes, no mezclar).

Figuras imposibles y Friedeberg
36. https://gershon.cs.technion.ac.il/papers/ModelImpossibleObjs.pdf — Elber 2011, "Modeling (Seemingly) Impossible Models", Computers & Graphics 35(3) (leído pp. 1-4).
37. https://www.cse.cuhk.edu.hk/~cwfu/papers/ifrender/ifrender.html — Wu, Fu, Yeung, Jia, Tang 2010, ACM TOG 29(2) (abstract).
38. https://www.isc.meiji.ac.jp/~kokichis/personal/sugilist.html — lista de publicaciones de Sugihara. https://nautil.us/the-illusion-machine-that-teaches-us-how-we-see-235154 — divulgación (secundaria).
39. https://en.wikipedia.org/wiki/Pedro_Friedeberg — formación, Goeritz, influencias (cita Reforma 1999-2011).
40. https://michaelbullock.nyc/volumes/journalism/pedro-friedeberg — entrevista: Ibero, Goeritz, "sin personas".
41. https://zetatijuana.com/2026/03/los-que-mas-estan-de-moda-son-los-que-peor-arte-hacen-pedro-friedeberg-a-zeta/, https://www.designboom.com/?p=1180670 — "un poco Piranesi, Beardsley, Escher" (snippets).
42. No abiertos (403 o PDF ilegible): https://www.frieze.com/article/palm-reader, https://repositoriodigital.ipn.mx/bitstream/123456789/25321/1/12-PedroFriedeberg.pdf, catálogos Bellas Artes 2009 y "La Casa Irracional".
