# ATELIER — Estudio de dibujo procedural

Status: In progress (v0 publicado con director local; v1 con Pedro por LLM publicado 2026-10-17; queda colgar la obra en el laberinto, propuesta de ChatGPT sin decisión de Bernard)
Proposed: 2026-10-17 by Bernard (chat ChatGPT "CRISTAL.CLI Game" t.257, nombre adoptado en t.269; fuente: `fuente-chat-cristal-cli-game-atelier-2026-10-17.md`)

**Qué es.** Un minijuego más de la consola de CRISTAL: el jugador narra, la IA sólo DECIDE ("La IA no genera los
píxeles. La IA decide qué dibujar, cómo componerlo y qué instrumentos utilizar. El código ejecuta cada trazo",
t.258), el motor dibuja trazo por trazo, capa por capa, y todo es trazable: receta JSON pública con semilla,
inspector de trazo, replay «ver cómo fue dibujada», exportar obra.svg + receta + historial + manifiesto de
procedencia; "Referencia externa: ninguna imagen externa utilizada". Filosofía de Bernard (t.269): IA artista
no-plagiadora, "inspiración matemática", nunca calcar. Sin victoria, sin timer, sin castigo.

**Ya aterrizado (`940976d`, 2026-10-17).** `web/atelier.html` → `web/src/atelier/`:
- `directorRules.ts` (reglas declaradas: patrón → decisión → porqué) y `director.ts` (narración → `Recipe`
  con `choices` marcadas `narración | defecto | humano`; `override`, `reseed`, `configFor`). Determinista: la
  semilla sale de la narración (fnv1a) salvo que la url traiga `seed`.
- `strokes.ts` (etapas con nombre de `graphics/application/compose.ts` → trazos indexados), `hitTest.ts`
  (toque en el lienzo → trazo más alto, ignora el fondo), `manifest.ts` (procedencia, conteo por etapa, hash
  del SVG, bitácora de trazos, descarga).
- `useDrawing.ts` (dibujo progresivo por rAF con velocidad ×1/×4/×16/×64, pausa, seek), `Atelier.tsx`,
  `RecipePanel.tsx`, `Inspector.tsx`. Reusa el kit de `src/minigames/kit/` y el motor `graphics/` tal cual: no
  hay gramática nueva.
- Verificado en dev 2026-10-17: 5235 trazos para "un templo de noche con siete columnas, lleno de galerías
  imposibles", inspector devuelve etapa/geometría/estilo/origen, replay por etapa; captura
  `i+d/friedeberg/capturas/atelier-dev-2026-10-17.jpg`. Tests: `director.test.ts`, `strokes.test.ts`.
- Verificado en prod 2026-10-17 (deploy run 39055703516, smoke con `/atelier.html` verde): `https://cristal.bernarduriza.com/atelier.html?n=una capilla de día, vacía y torcida`
  dibuja 2504 trazos con la receta correcta (friedeberg, anomalía 0.95, densidad 0.2, complejidad 1), consola sin
  errores, y la landing lista los tres juegos. Captura `i+d/friedeberg/capturas/atelier-prod-2026-10-17.jpg`.

**Pedro, el director por LLM (`8854d08`, `4269a57`, `3aa2daf`; 2026-10-17).** `server/atelier.py` expone `POST /atelier/direct`
{narration, seed} → {title, choices[{field, value, because, source:"pedro"}]}; persona en `server/prompts/atelier.md`
(casita AIRE `cristal-atelier`, modo complete, sin herramientas); valores fuera de la gramática se descartan, nunca
se adivinan. En el web (`atelier/directorApi.ts`, `usePedro.ts`, `PedroPanel.tsx`, `withDirection`): al dibujar, el
motor dibuja la lectura local al instante y pide la de Pedro sin bloquear; el panel muestra título y decisiones con
su porqué y el jugador elige; los overrides humanos nunca se pisan; sin API, la lectura local se queda y se dice.
Verificado en prod 2026-10-17: `curl /atelier/direct` con "una capilla de noche, vacía y torcida, con siete columnas"
→ 200 en 32 s, 7 decisiones válidas ("Dijiste torcida, no simétrica" → asymmetric; "Pediste vacía" → density 0.2);
en la página, "un patio imposible de noche con nueve columnas" → Pedro contestó en 34 s con «Patio Imposible
Nocturno», al aceptarlo la receta cambió de título y las 7 decisiones quedaron marcadas pedro; consola limpia.
Captura `i+d/friedeberg/capturas/atelier-pedro-prod-2026-10-17.jpg`. Lección del deploy: la revisión 0000008 cayó
por un `atelier.py` que el Dockerfile no copiaba y el smoke aprobó con el `/health` de la revisión vieja; el
workflow ahora espera a que la revisión nueva corra la imagen pusheada (`3aa2daf`).

**Escena (`41a7b87`, 2026-10-17) y la crítica de Bernard: «sigue muy simple».** El director ya escribe una escena
(criaturas compuestas, cantidad, acomodo, lugar, escala del edificio), pero el edificio sigue siendo el mismo claustro
y las criaturas son collage. Se le contó a Astra en el chat «CRISTAL.CLI Game» y respondió con tres commits concretos
(fuente literal: `fuente-astra-atelier-no-simple-2026-10-17.md`): `architecture-grammar` (grafo espacial, R1–R6,
validador, solver, cuatro programas con topologías distintas), `structural-rewrites` (roles y anchors, T1 columna
antropomórfica, T2 cuerpo-fachada, T3 abertura recursiva, T4 ornamento habitable, oclusión) y `complexity-report`
(diversidad topológica, profundidad semántica, cobertura multiescala por bandas de tamaño, familias de siluetas, con
umbrales de aceptación). En ejecución 2026-10-17.

**Canónico a reusar.** `web/src/graphics/` (gramática + pintores + SVG/Canvas), `web/src/minigames/kit/`.
Para el director por LLM: `cristal-api` (`server/`) y `web/src/game/roomApi.ts` como precedente de llamada;
la regla dura 2 (no tocar guardrails) y la regla `prompts-as-content-not-code`.

**Decisión de Bernard.** Colgar la obra exportada en un muro del laberinto (t.258) es propuesta de ChatGPT, no
orden suya: queda aquí hasta que la tome. p5.js se descartó por la regla dura 8.

**Next.** Motivos figurativos Bézier (t.262/264); el patio imposible axonométrico sobre `domain/architecture/`
(t.268); si Bernard lo toma, colgar la obra en un muro del laberinto (t.258).
