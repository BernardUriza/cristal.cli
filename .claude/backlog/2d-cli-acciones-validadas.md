# 2d.cli: terminal en la habitación con acciones validadas por el motor

Status: Proposed
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** El LLM propone acciones (`inspectRoom`, `openPassage`, `changePattern`, `returnToHub`,
`saveReflection`); el motor comprueba permisos y ejecuta sólo operaciones conocidas [220]. Siguiente
paso concreto: UNA habitación neobarroca conectada a un 2d.cli, no un framework gigante [220].

**Ya aterrizado.** Las consolas del laberinto web y `recordConsoleInput` en `web/src/game/store.ts`;
`InWorldConsole` + `ConsoleUIBridge` en Unity.

**Decisión de Bernard (abierta).** ¿2d.cli es overlay HTML sobre el canvas o pantalla integrada en el
mundo 3D? [220]. Hoy en web es overlay; en Unity es world-space.

**Next.** Bernard decide; luego el set de acciones validadas como tabla de permisos en config.
