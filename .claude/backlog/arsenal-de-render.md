# Arsenal de render más allá de SVG/HTML

Status: In progress (Canvas 2D, Three.js y GLSL ya en el motor; falta el shader de pared con colisiones intactas)
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Bernard preguntó qué más dibuja en pantalla el arte moderno [227]. ChatGPT: Three.js esencial,
SVG y Canvas 2D altas, GLSL alta (patrones en GPU), p5.js opcional, Houdini/TouchDesigner baja [228];
paredes que cambian de patrón sin cambiar colisiones (shaders + geometría vectorial) [228].

**Ya aterrizado (`8b10294`, 2026-10-15; reportado 2026-10-17).** Los tres medios altos de la lista ya dibujan
la misma gramática: SVG (`renderers/svg`), Canvas 2D (`renderers/canvas`) y Three.js (`renderers/three`),
con GLSL en `renderers/three/shaders/` (tablero del piso con fog, nervaduras de cúpula, vértices compartidos).
Vista previa por backend: `/laberinto.html?view=graphics&backend=svg|canvas|three`.

**Canónico a reusar.** `Assets/Shaders/Terminal/CRTEffect.shader` (Unity) como precedente de shader;
el renderer de `web/src/graphics/`.

**Decisión de Bernard.** Ninguna.

**Next.** Un shader de patrón recursivo en una pared del laberinto web, con las colisiones intactas.
