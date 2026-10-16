# Gramática estética procedural (capa sobre el motor Three.js)

Status: In progress
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Pipeline IA conversacional → motor de decisiones → gramática visual → renderizador
vectorial [218]; habitación como JSON con seed (`rendering.generativeImages: false`) [218]; una gramática,
múltiples renderizadores, dominio sin saber de renderizadores, módulos 40–120 LOC, config tipada
(`seed, density, complexity, anomalyRate, palette, symmetry, projection, lod, renderBackend`) [230];
tres operaciones programables: hibridación, variación, acumulación [216]; biblioteca de motivos y
reglas artísticas, no aleatoriedad ("protector de pantalla genérico") [218]; versionar cuadros con la
misma seed [226]. ChatGPT, adoptado por Bernard en [229].

**Ya aterrizado.** Commit `4ca40ec` (ornamento en tres escalas, galerías en perspectiva, anomalías, LOD):
`web/src/game/ornamentMotifs.ts`, `i+d/friedeberg/out/`. Pendientes visuales declarados: ventanitas de la
galería se leen como píldoras; sofito con casetones se confunde con un segundo friso [229].

**Canónico a reusar.** `web/src/graphics/` (domain/application/compose) — ya existe la separación de
capas; no crear otra.

**Decisión de Bernard.** Ninguna abierta; es ejecución.

**Next.** Los dos pendientes visuales del templete; 20 variaciones del mismo templete con una gramática
[224].
