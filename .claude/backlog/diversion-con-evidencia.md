# Diversión con evidencia: la consola nunca rechaza, nunca repite, siempre mueve

Status: In progress (puntos 1–6 Done 2026-10-17; 5 y 6 pendientes de verificar en prod)
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

**Verificado en prod (2026-10-17 10:00, deploy `d71f1fb`):** secuencia del tester → 4 líneas distintas, presión 0 %; diez turnos
de `no siento nada, da igual` → diez líneas distintas, `...` con nag en el octavo, pivot al cuarto de la confesión en el noveno.
Detalle y captura en `Donde_quedamos.md`.

**Hecho, punto 2 (2026-10-17).** Cada frase tecleada en una consola queda escrita en un muro de la celda de esa
consola (y luego en anillos hacia afuera), con el acento de la consola y atenuada si el stance fue evasivo:
`web/src/game/inscriptions/WorldInscriptions.ts` (colocación determinista por anillo BFS sin repetir muro, pose
pegada al muro mirando al centro, `deformPhrase` para la ambigüedad, persistencia en `localStorage` con tope 24),
`WallInscription.tsx` (plano con textura canvas, revelado en 1.6 s), `DiscoveryClock.ts` (segundos sin hallazgo:
nodo, inscripción, frase; umbral 60 s) y `useDiscoveryClock.ts` (muestrea la pose a 12 Hz en exploración; sin
hallazgo un minuto, el laberinto escribe un fragmento deformado de las palabras del jugador uno o dos anillos
adelante). El HUD de debug muestra `hallazgo: Ns · finds · hambre N`. Verificado en dev (hambre real a los 60.2 s) y en prod
(deploy `5938ca4`: dos frases en los muros este y oeste de ALPHA, captura en `Donde_quedamos.md`). El glifo y la puerta como cambios visibles
quedan para cuando el cuarto IA (`/generate`) deje de tardar 40 s (`latencia-cristal-api.md`).

**Hecho, punto 3 (2026-10-17; Bernard eligió el endpoint en cristal-api para el embudo).**
- Embudo: `web/src/game/funnel.ts` (siete pasos: laberinto → pointer_lock → first_step → console_open → first_phrase →
  glyph_invoked → door_crossed; segundos desde la carga, una vez por visita, en `sessionStorage`), `funnelClient.ts`
  (`sendBeacon` a `POST /telemetry/funnel`, anónimo: id aleatorio de 12 letras, paso, segundos, build; nunca el texto
  ni la IP), `server/telemetry.py` (JSONL en `CRISTAL_TELEMETRY_PATH`, `GET /telemetry/funnel/summary` con
  `X-Admin-Token` = `CRISTAL_TELEMETRY_TOKEN`: sesiones, alcanzados por paso, mediana de segundos, caída respecto al
  paso anterior; 503 si el token no está), tests en `server/test_telemetry.py`.
- Un verbo a la vez: `web/src/ui/OnboardingHint.tsx` muestra "click para mirar" hasta el pointer lock y "W A S D para
  caminar" hasta el primer paso; después manda el rito del `ObjectivePanel`. Placeholder de la consola con ejemplo real
  («me pesa el pecho»). HUD de debug: `embudo: k/7`.
- **Gate de Bernard, con `!` (`az … create` está vetado en la sesión; el app vive en `portfolio-rg`/`portfolio-env`):** `! bash server/telemetry-storage.sh`
  monta un Azure Files en `/home/runner/telemetry` (sin eso el JSONL muere con cada revisión) y pone el secreto
  `telemetry-token` (en `~/.secrets/cristal-telemetry-token.txt`). **Corrido por Bernard 2026-10-17:** storage account
  `cristaltelemetry`, share montado, revisión `cristal-api--0000004` lista; `GET /telemetry/funnel/summary` con el token
  contesta con el JSONL persistido. Los eventos anteriores a la revisión 4 (disco local) se perdieron, como estaba previsto.

**Hecho, punto 4 (2026-10-17).** `web/src/memorama/`: distintividad medida por firma de rasgos (`artSignature`: paleta,
complejidad, proyección, simetría, densidad en tres cubetas) y reparto con rechazo (`dealArtSeeds`: cada par difiere
de todos los demás en ≥2 ejes, probado en 120 partidas de 6/8/12 pares); historial de jugadas → resultado compartible
sin spoiler («CRISTAL memorama · templo del día 8660 · 6 pares · 10 movimientos / ▢▢▢▣▢▣▣▣▣▣ / url»); semilla del día
(`dailySeed`, FNV de la fecha local) como partida por defecto y botón «hoy»; mejor marca por semilla y pares en
`localStorage` («nueva mejor marca (antes N)» / «mejor marca N»); juice suave: pulso y halo al acierto, atenuación breve
al fallo, respiración lenta de los pares resueltos, dos tonos cortos (acierto, victoria) con botón ♪ persistido; sin
timer ni castigo. Compartir: portapapeles en escritorio, hoja nativa solo con puntero táctil (en Chrome de escritorio
la hoja nativa deja la promesa colgada). Verificado en dev y en prod (deploy `3a0a0cf`) jugando una partida completa por DOM.

**Hecho, punto 5 (2026-10-17, `ceadffc`).** Modo viaje (`?viaje=1` o botón VIAJE, persistido en `cristal.viaje.v1`):
pantalla escasa (sin HUD de debug, minimapa, badges, beats ni etiqueta de modo), texto grande (objetivo y prompt 24 px,
hint 32 px, consola 24 px), CRT sin parpadeo, salida grande siempre visible abajo a la izquierda (consola → desconecta,
cuarto → sale, laberinto → vuelve al selector), el laberinto camina solo hacia el objetivo del rito a paso lento tras
6 s sin tocar nada (`autowalk.ts` + `stepTowards`; cualquier tecla o movimiento del puntero lo corta), y la niebla y la
luz ambiente se abren con cada frase escrita (`viajeAtmosphere(rewardLevel(inscripciones))`). Además, tope global de
parpadeo de luces a 2.5 Hz (`flashSafety.ts`): la luz del cuarto IA oscilaba a 5.9 Hz con dread alto y a 4.6 Hz con
presión, fuera de WCAG 2.3.1, para todos los jugadores. Verificado en dev: clase `viaje`, salida, HUD oculto,
deriva de spawn a ALPHA a los 6 s. Lo que sigue siendo del tester: legibilidad del texto en el viaje (preguntar).

**Hecho, punto 6 (2026-10-17, `8c63e3c` + web).** Bernard autorizó el eco anónimo y deformado. `server/echo.py`:
`POST /echo` guarda la frase (≤64 chars, sin sesión ni IP) en `echo.jsonl` del share montado; `GET /echo?exclude=`
devuelve una ajena al azar entre las últimas 400. Cliente: al archivarse la confesión se manda y se pide una ajena
(`echoClient.ts`, también al cargar); la hambre escribe primero la frase ajena deformada con acento violeta (fuente
`echo`) y después las propias. Sin moderación automática, como se dijo al autorizar: el deformado atempera, no filtra.

**Next.** Verificar 5 y 6 en prod tras el deploy; después el item queda Done salvo lo que es del tester (legibilidad
del texto en el viaje) y de Bernard (DM a `me.tikkum`).
y el DM a `me.tikkum` sigue pendiente de Bernard (borrador en `Donde_quedamos.md`).
