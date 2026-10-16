# Arsenal de render más allá de SVG/HTML

Status: Proposed
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Bernard preguntó qué más dibuja en pantalla el arte moderno [227]. ChatGPT: Three.js esencial,
SVG y Canvas 2D altas, GLSL alta (patrones en GPU), p5.js opcional, Houdini/TouchDesigner baja [228];
paredes que cambian de patrón sin cambiar colisiones (shaders + geometría vectorial) [228].

**Canónico a reusar.** `Assets/Shaders/Terminal/CRTEffect.shader` (Unity) como precedente de shader;
el renderer de `web/src/graphics/`.

**Decisión de Bernard.** Ninguna.

**Next.** Un shader de patrón recursivo en una pared del laberinto web, con las colisiones intactas.
