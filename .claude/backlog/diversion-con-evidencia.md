# Diversión con evidencia: la consola nunca rechaza, nunca repite, siempre mueve

Status: In progress (punto 1 Done 2026-10-17, `673ef59`; puntos 2–6 Proposed)
Proposed: 2026-10-17 by Bernard ("cómo hacer el juego más divertido"; /histerical-search, 6 investigadores, ~40 fuentes)

**Qué es.** Veredicto completo con fuentes: `entregables/como-hacer-el-juego-mas-divertido-2026-10-17.html`.
Un juego sin fallo vive de autonomía, descubrimiento como sustituto de la competencia y ambigüedad (SDT 2006/2010,
Muscat 2016, Juul 2018). Lo mata rechazar la entrada (Façade 2003/04), repetir líneas (Valve, Hades), caminar lento
sin hallazgos (Muscat) y esperar (LLM-NPC 2025). Orden de palanca:

1. **Consola** — stance catch-all con respuesta real (refleja o deflecta en personaje), `...` nunca solo (nag y al
   siguiente turno cambia de tema o abre puerta; Short 2009); shuffle-bag con memoria en vez de `hash(input)`
   (Valve `norepeat`); pool 8–12 por stance con variantes por contexto, regla más específica gana (Hades, Ruskin);
   el clasificador contesta al instante y el modelo nunca bloquea; permisividad semántica (Façade §6).
2. **Densidad de hallazgo** — cada frase cambia algo visible en el mundo (inscripción con las palabras del jugador
   vía `MemoryEchoEngine`, glifo que cambia, puerta que aparece); medir segundos sin hallazgo y poner algo.
3. **Primeros cinco minutos** — un verbo a la vez, "click para mirar" pegado al pointer-lock, placeholder con
   ejemplo, instrumentar el embudo (landing → pointer lock → paso → consola → frase → glifo → puerta).
4. **Memorama** — juice suave, distintividad entre pares (silueta + rasgo dominante), semilla del día + resultado
   compartible sin spoiler + mejor marca por semilla (Wordle). Sin timer ni castigo.
5. **Modo viaje** — pantalla escasa que retrocede (Mediano 2024), ≤3 destellos/s (WCAG 2.3.1), sin sustos de texto
   ni sonido, se juega solo si sueltas (Everything), recompensa que crece con la entrada (Tetris Effect).
6. **Relación** (inferencia) — la frase archivada la encuentra deformada el siguiente jugador; People Fun sin
   multiplayer (Journey).

**Canónico a reusar.** `PsychologicalResponseEngine`, `CristalReplyBuilder`, `SilenceEngine`, `MemoryEchoEngine`,
`StancePressureTracker`; nada se reescribe, se amplía el pool y se cambia la selección.

**La decisión de Bernard.** El orden (consola primero, minijuegos después: Art. 8 diferenciador). Si `...` puede
existir sin salida (regla 6; aquí la evidencia dice que no: Short 2009, Façade). Si la relación asíncrona entre
jugadores entra al universo.

**Lo que no existe en ninguna fuente y hay que medir aquí:** drop-off en WASD/pointer-lock, legibilidad de texto en
el viaje (preguntar al tester mañana), retención de memoramas.

**Hecho (2026-10-17, `53d4178` + `673ef59`).** Punto 1 completo en `web/src/terminal/psych/`:
`replyPool.ts` (pool tipado, 12 líneas por stance + catch-all + nag + pivot, condiciones `when` y placeholders
`{palabra}` `{frase}` `{glifo}` `{objetivo}`), `ReplyBag.ts` (shuffle-bag sembrado por `sessionId` + turno: nunca
la misma línea dos veces seguidas, agota el nivel más específico y baja al genérico), catch-all que refleja la
palabra del jugador y al segundo turno pivota hacia el objetivo del rito, respuesta corta (≤6 palabras) a una
pregunta corporal cuenta como confesión, léxico sensorial ampliado, `...` siempre con nag y al turno estancado
siguiente pivot con reinicio del estancamiento; la segunda fuente de `...` solo (`RuntimeTransference`) también
cerrada. Tests: la secuencia exacta del tester da 4 líneas distintas; 12 turnos del mismo stance sin repetir y con
pivot; basura refleja una vez y pivota. Suite 64/342 verde, typecheck y build verdes.

**Dos exclusiones del punto 1, decididas por Claude y anunciadas:** (a) "el modelo nunca bloquea" no se construyó:
hoy la consola no llama a ningún modelo (`server/app.py` solo expone `/generate` y `/tarot/reading`), la invariante
se cumple por ausencia y el enriquecimiento asíncrono es un endpoint nuevo que pertenece a
`ia-psiconauta.md` / `rag-corpus-psiconautico.md`; (b) `...` nunca solo se tomó como decidido por este item y cierra
la decisión que `rito-rechaza-respuestas-corporales.md` dejaba abierta. Si Bernard quiere `...` terminal, se revierte
solo `SilenceEngine.ts`.

**Next.** Verificar en prod con la secuencia del tester más 8 turnos del mismo stance (receta en `Donde_quedamos.md`);
luego Bernard decide entre los puntos 2–6 (densidad de hallazgo, primeros cinco minutos, memorama, modo viaje, relación).
