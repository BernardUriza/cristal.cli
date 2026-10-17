# ATELIER — Estudio de dibujo procedural

Status: In progress (v0 publicado; director determinista, falta el director por LLM y colgar la obra en el laberinto)
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

**Canónico a reusar.** `web/src/graphics/` (gramática + pintores + SVG/Canvas), `web/src/minigames/kit/`.
Para el director por LLM: `cristal-api` (`server/`) y `web/src/game/roomApi.ts` como precedente de llamada;
la regla dura 2 (no tocar guardrails) y la regla `prompts-as-content-not-code`.

**Decisión de Bernard.** ¿El director v1 por LLM (Claude "se convierte en Pedro", t.257) vive en cristal-api
como `/direct` devolviendo la misma `Recipe`? ¿p5.js que propuso ChatGPT se descarta por la regla dura 8
(SVG/Canvas/Three sobre lo que existe)? Hoy se descartó.

**Next.** Director por LLM que devuelva `Recipe` (misma forma, mismas reglas de trazabilidad); motivos
figurativos Bézier (t.262/264); colgar la obra exportada en un muro del laberinto (t.258); el patio imposible
axonométrico sobre `domain/architecture/` (t.268).
