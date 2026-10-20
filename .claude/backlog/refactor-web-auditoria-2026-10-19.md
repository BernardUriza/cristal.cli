# Refactor de web/: duplicación, capas y archivos con varias responsabilidades

Status: Proposed
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

**Decisión de Bernard.** Ninguna bloqueante; el orden es de Claude. Sólo `AbsencePlanner` cambia salida al unificar.
