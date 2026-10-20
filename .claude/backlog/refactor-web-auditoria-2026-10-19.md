# Refactor de web/: duplicación, capas y archivos con varias responsabilidades

Status: Done
Proposed: 2026-10-19 by Bernard ("busca qué más falta refactorizar"); auditoría de Claude con dos agentes y verificación por grep

**Qué es.** Lo que falta refactorizar en `web/src` (26.8k LOC), medido por responsabilidades y copias, no por tamaño.
Los archivos calientes de octubre (`graphics/application/patio/`, `atelier/`) ya están chicos (<175 LOC); la deuda
está en el juego 3D viejo, la terminal y lo compartido.

## Bug encontrado (va primero)

- `game/RuntimeTransference.ts:171` `observeSymbol` recompone con `room: null`, `history: []` y presión 0
  (`worldBehavior ? 0 : 0`, ternario muerto). Dentro de un cuarto, `store/pressureSlice.ts:58` llama `enterRoom`
  enseguida y restaura `worldBehavior`, pero `identityDrift.update` (con estado) corre DOS veces por símbolo, la
  primera con presión 0 y cero ecos: la deriva de identidad se sesga con cada glifo.
- `game/BackroomFurniture.tsx:56-73`: el `Set` del presupuesto de luces de área sólo crece; tras 8 claves, un
  laberinto nuevo ya no recibe luces de área. Materiales en caché de módulo nunca se liberan.
- `ui/Minimap.tsx:58` muta el `Set` de visitados durante el render.

## Duplicación (canónico → copias), verificado por grep

1. **RNG/hash → `shared/rng.ts`.** `mulberry32` copiado en `game/BackroomFurniturePlacer.ts:40` y variante en
   `game/roomApi.ts:137`; `shuffle` en `terminal/psych/ReplyBag.ts:90` y `BackroomFurniturePlacer.ts:68`; mezclador
   `0x45d9f3b` en `roomApi.ts:21`, `RuntimeTransference.ts:60`, `AbsencePlanner.ts:28` (este con UNA ronda: unificarlo
   cambia su salida). Los cuartos se cachean por semilla: test de secuencia dorada antes de cambiar.
2. **Tokens CSS → `shared/tokens.css`.** `:root` repetido en `styles.css`, `atelier.css`, `landing.css` (`--bg` negro
   puro), `memorama.css`, `building.html`; reset y body ×5; botones copiados del kit en `memorama.css:40`,
   `atelier.css:115`, `building.html:14`.
3. **API → `shared/api.ts`.** `API_BASE_URL` vive en `game/roomApi.ts:5` y lo importan atelier y terminal (de ahí
   sus dependencias de `game/`); patrón AbortController+timeout+fallback ×3; beacon `keepalive` ×2
   (`echoClient`, `funnelClient`). `atelier/programApi.ts` no hace fetch: es un validador mal nombrado.
4. **Storage → `shared/storage.ts`.** 16 llamadas `localStorage`/`sessionStorage` con el mismo guard+try/catch en
   7 módulos; `game/viaje.ts:33` es el mismo flag que `kit/sound.ts:31`.
5. **AudioContext ×2**: `game/audio.ts:6` y `kit/sound.ts:1`.
6. **clamp/lerp/smoothstep/color/geometría**: `shared/math.ts` sólo tiene `clamp01`; ~20 copias de clamp/lerp,
   `hexToRgb` ×2, `polygonArea` ×3, point-in-polygon ×2.
7. **URL params y DPR**: parseo a mano en `main.tsx`, `game/viaje.ts`, `store/sessionSlice.ts`,
   `GraphicsPreview.tsx`; `deviceScale` vive en `kit/templeCanvas.ts` (arrastra todo compose) y `building/main.ts`
   usa `devicePixelRatio` sin tope.

## Archivos con varias responsabilidades (cortes propuestos)

1. `ui/ConsoleOverlay.tsx` (277): línea con scramble, streaming de voz, orquestación del turno, copy → `ui/console/`.
2. `game/store/roomFlowSlice.ts` (285): parches puros, semilla de glifo, carga async, 6 `saveVerticalSlice` dentro de
   reducers → parches puros + un solo suscriptor que persiste.
3. `game/BackroomFurniture.tsx` (528): catálogo de 14 modelos se queda; salen materiales (switch de 30 casos → tabla
   tipada), presupuesto de luces (puro, testeable) y primitivas.
4. `game/RuntimeTransference.ts` (349): sale `adaptTerminalResponse` con su copy y los dados del mundo.
5. `ui/Minimap.tsx` (195): política de ruta y coordenadas a módulos puros.
6. `game/MusicDirector.ts`, `terminal/terminalCore.ts` (tabla `ARCANA`), `game/VerticalSlice.ts` (persistencia): cortes chicos.
   Se quedan: `responses.ts`, `plan.ts`, `Atelier.tsx`, `App.tsx`, `Memorama.tsx`, `PersistentTransference.ts`.

## Capas

`graphics/layering.test.ts` sólo vigila dentro de `graphics/`. Huecos: `graphics/*/glyph.ts` importa
`game/symbolicBus`; `^react` no atrapa `@react-three/*`; sólo lee comillas dobles; sin reglas para `renderers/`,
`presentation/`, `shared/`; ciclos terminal↔game y ui↔game. `graphics/CLAUDE.md:12` dice que `rng` vive en
`domain/` y vive en `shared/`.

## Código muerto (cero importadores fuera de tests)

`isMusicMuted`, `recordEnvironmentalDeflection`, `spaceRectSize`, `spaceById`, `SPACE_KINDS`, `RELATIONS`,
`scaling`, `approxEqualMat`, `v3`, `approxEqual`, `withLevel`, `withStroke`; la fachada `defaultApi` de
`PersistentTransference.ts:265`; re-exports sin uso en `game/room/index.ts` y `graphics/application/complexity/index.ts`;
rama muerta de `determineLevel` en `terminal/responseEngine.ts:163`.

## Orden

Bug de `observeSymbol` → `shared/rng` con tests dorados → `tokens.css` → `shared/api` (quita atelier/terminal→game)
→ `shared/storage` → test de capas para todo el repo → audio → math/color/geometría → barrido de muertos y
`graphics/CLAUDE.md` → cortes de archivos. Cada paso cierra con el grep de cero copias en el reporte.

## Avance

- `780863a` bug de `observeSymbol`: un glifo ya no mueve la identidad (test con `identity.updates`).
- `3a0e813` `shared/rng`: `mix32`/`unitHash`/`GOLDEN_RATIO_HASH`; snapshots dorados (`shared/rngGolden.test.ts`)
  prueban salida idéntica de salidas, cuartos, muebles, puertas falsas y respuestas. Bug extra encontrado y
  cerrado: `planAbsence` reventaba (`consoles[-n]`) cuando el slot de una ronda caía en la mitad alta.
- `faa5e29` `shared/tokens.css`: un `:root`; landing sólo sobrescribe `--bg`; verificado con estilos computados
  en las cuatro páginas.
- `740c9ec` `shared/api` (`withTimeout`, `postJson`, `beacon`): atelier ya no importa `game/`; verificado en prod
  (Pedro contestó en 59 s).
- `165752f` `shared/storage` (`readJson`/`writeJson`/`flagStore`): verificado en el navegador, sonido y mejor marca
  sobreviven al reload.
- `716bee4` `src/layering.test.ts` para todo el repo con `KNOWN_DEBT` vacío (`SymbolicArchetype` → `shared/archetype`,
  puerto `responseShaper` de la terminal, `ErrorBoundary` → `game/`).
- `99ffbec` `shared/audio`: un solo `AudioContext` (verificado: un contexto, un oscilador por par).
- `303e720` `shared/math` (`clamp`, `lerp`, `smoothstep`), `shared/color` (`hexToRgb`/`rgbToHex`/`mixHex`;
  `hexToLinearRgb` parsea con él) y `signedArea`/`polygonArea` junto a `pointInPolygon` en `graphics/domain/bezier.ts`;
  21 copias borradas. Se quedan locales, a propósito: el `clamp` de `body/contact.ts` (límites invertidos → centro),
  el `lerp` de `Vec2` en `morph/blend.ts` y el de `Vec3` en `math/vec3.ts` (otra firma), `lerpRgb` (espacio lineal,
  ahora sobre `lerp`). Las copias inline de clamp01 pasan a `clamp(x, 0, 1)` y no a `clamp01`, que convierte NaN e
  Infinity en 0; sólo `config/validate.ts` usa `clamp01` porque ya rechaza lo no finito. Snapshots dorados intactos.
- `28d43f3` barrido de muertos: los doce símbolos, la fachada `defaultApi` (nadie importaba `load`/`save`/…; ya no lee
  localStorage al importar), la rama de progresión de `determineLevel` (su único llamador siempre trae patrón) y los
  re-exports sin uso de `game/room/index.ts` y `complexity/index.ts`. El barril de complexity conserva lo que importan
  `atelier/manifest.ts` y `i+d/friedeberg/complexity-baseline.ts`; los tests que entraban por él leen su módulo.
- Abierto: una corrida de la suite tuvo `connectivity.test.ts` en rojo una vez y 5 verdes después; semillas fijas,
  sin `Math.random`, sin ediciones ajenas. Causa sin verificar.
- `27e8f33` `shared/url` (`searchParams`, `stringParam`, `flagParam`, `numberParam`, `positiveIntParam`,
  `replaceSearch`, `shareUrl`; sin `window` lee `""`) y `shared/display` (`deviceScale`, tope 2). `kit/urlParams.ts`
  borrado; `main.tsx`, `viaje`, `sessionSlice`, `GraphicsPreview`, atelier y memorama lo usan; `building/main.ts` ya
  no usa `devicePixelRatio` sin tope. Grep: `new URLSearchParams`/`location.search`/`devicePixelRatio` sólo en
  `shared/`. Navegador (DPR 2.5): atelier 2400×1800 = 1200×900×2, building 1280 = 640×2, laberinto R3F 1280 = 640×2
  (su `dpr` por defecto `[1,2]`, no se toca); `?viaje=1` → true, `?viaje=off` → false; memorama sin `pairs` → 8.
  Visto de paso, sin tocar: `building/main.ts` sólo redimensiona en `resize` de ventana, así que la altura del
  canvas queda vieja si el layout cambia después de arrancar (262 vs 113×2 hasta un `resize`). Cerrado en `7199a7a`.
- `6d717c0` bug de muebles: `game/furniture/areaLightBudget` (`assignAreaLights`, puro y por laberinto) y
  `furniture/materialCache` (un caché por montaje de `BackroomFurnitureSet`, `dispose()` al desmontar). El test nuevo
  falló con el `Set` de módulo (3 rojos) antes del arreglo. Navegador: 29 materiales liberados al salir del laberinto,
  2 luces de área y materiales nuevos al volver.
- `7e4c494` bug del minimapa: visitados derivados con `withVisited` (sin mutar) y recordados en un efecto;
  `ui/minimap/routePolicy` (`planMinimapRoute`) y `ui/minimap/coords` (`poseCell`, `poseMarker`) con tests. Navegador:
  tras teletransportar a VISION y CORRUPTION sus marcas bajan a 0.4 y la ruta pasa a BETA 7.
- `d62f6b9` corte de `BackroomFurniture.tsx` (529 → 343): `furniture/materials` (tabla tipada `FURNITURE_MATERIALS`),
  `furniture/materialsContext`, `furniture/primitives`; las 34 firmas de material idénticas en el navegador.
- `58cb634` corte de `roomFlowSlice` (285 → 216): `store/roomFlowPatches` puros y un solo suscriptor
  (`store/persistVerticalSlice`); cero `saveVerticalSlice` en reducers (eran 6 aquí y 2 en `consoleSlice`). Test verde
  antes y después: lo guardado = el estado tras cada acción, misma secuencia de pasos.
- `fe98600` corte de `ConsoleOverlay` (277 → `ui/console/ConsoleOverlay.tsx` 112 + `ConsoleLine`, `scramble`, `lines`,
  `useVoiceStream`, `turn`, `copy`); el archivo viejo borrado. Navegador: eco, frase archivada, objetivo y respuesta
  local iguales; el POST de voz sale (servidor local 8131 apagado en esta corrida: rama de silencio).
- `fd9a5d7` corte de `RuntimeTransference` (345 → 283): `game/transference/terminalAdapter` (con
  `TERMINAL_ADAPTER_COPY`) y `game/transference/worldDice`; prueba diferencial contra la clase previa, 4800 respuestas
  idénticas; snapshots dorados intactos.
- `1de471f` cortes chicos: `terminal/arcana` (terminalCore 225 → 185), `game/music/selection` y
  `game/music/settingsStore` (MusicDirector 272 → 182), `game/VerticalSliceStorage` (VerticalSlice 256 → 213).
- El rojo suelto de `connectivity.test.ts` no se repitió en las 8 corridas completas de esta tanda.

**Decisión de Bernard.** Ninguna bloqueante; el orden es de Claude. Sólo `AbsencePlanner` cambia salida al unificar.
