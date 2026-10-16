# IA psiconauta: acompañante que aprovecha el estado alterado

Status: Proposed
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** La IA del laberinto no tranquiliza: hace preguntas ancladas en conversaciones previas del
jugador ("ahora que estás en ese estado puedes ver X de lo que habíamos hablado") y elige micro-momentos
de juego para enseñar al psiconauta experimentado a usar la sustancia como herramienta. Bernard
[190], [194], [221]. ChatGPT aporta la capa de compañía: memoria breve de sesión, integración posterior
en sobrio ("¿esta idea todavía te parece interesante?"), y que se calle si el jugador sólo quiere caminar
[193], [195], [222], [230].

**Canónico a reusar.** `web/src/terminal/psych/` (ToneArbitrator), `web/src/game/VerticalSlice.ts`
(`noteConsoleInput`), `cristal-api /generate` con `fragments`. Reglas duras 2, 5 y 6.

**Decisión de Bernard (abierta).** Tensión no cerrada: ChatGPT empuja "sitting, not guiding" / no sacar
provecho psicológico [195], [222], [235]; Bernard quiere justo sacarle provecho al estado [194], [221].
Y: ¿la IA diseña situaciones desde el diálogo o selecciona de una biblioteca curada? [222].

**Next.** Bernard cierra las dos preguntas; luego se escribe el prompt de la IA como contenido
(`prompts/*.md`, nunca inline).
