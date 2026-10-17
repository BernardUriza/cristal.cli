# CRISTAL.CLI - Donde Quedamos

## Estado Actual: Phase 6.7 - Dream Tunnels Complete

**Version:** 0.6.7
**Ultima actualizacion:** 2026-10-16

---

## Web publicada (2026-10-16)

- `web/` vive en https://cristal.bernarduriza.com (Static Web App `cristal-cli`, `portfolio-rg`; host default
  `lemon-mushroom-04a84da0f.3.azurestaticapps.net`). Deploy: push a `main` tocando `web/**`
  (`.github/workflows/azure-static-web-app.yml`). Provision y promote: `web/provision.sh`, `web/promote.sh`.
- `/` es el selector; `/laberinto.html` el juego 3D; `/memorama.html` el memorama de templos Friedeberg
  (`web/src/memorama/`, arte por semilla desde `web/src/graphics/`).
- El laberinto publicado usa `cristal-api` para `/generate` (CORS ya incluye el dominio); sin API cae a `localRoom`.
- Portafolio: proyecto id 8 en portfolio-spring, visible en bernarduriza.com.
- Pendiente al cerrar la sesión: el dominio estaba en `Validating` en Azure (cert); cuando conteste 200 la
  variable `CRISTAL_WEB_HOST` del repo pasa al dominio y el smoke del workflow lo prueba.

---

## Betatesters (2026-10-16)

| Quién | Canal | Estado | Qué recibió |
|---|---|---|---|
| `me.tikkum` (Instagram) | DM https://www.instagram.com/direct/t/17847378020577220/ | 2026-10-16 12:40 se ofreció; 12:43 link; ~12:55 homework #1 enviado. **2026-10-16 23:09 y 23:41 entregó las DOS partes** (ver abajo). 2026-10-17 06:20 Bernard contestó "Jaja se trabó / Muchas gracias por la prueba". **Fix en prod 2026-10-17 09:25 (`acdfe2d`), verificado con su secuencia exacta.** Pendiente: Bernard le contesta (borrador abajo). | https://cristal.bernarduriza.com/ — memorama desde el cel (touch OK), laberinto desde compu. |

Feedback de betatesters: se registra aquí, con fecha y cita, y lo accionable pasa a `.claude/backlog/`.

### Homework #1 de `me.tikkum` (entregado 2026-10-16 23:09–23:41, leído del DM 2026-10-17 09:10)

Evidencia: `~/Documents/personal-assistance/cristal-betatesters/2026-10-16-me-tikkum-*.png` (fuera del repo: es público).

**Parte 1, memorama `seed=777&pairs=8` desde el cel:** completado, **17 movimientos** (mínimo posible 8).
Cita: *"Me acordé más del 4° del 2° renglón y 2° del 3er renglón... tal vez por ser el que tenía menos
detalles"*. Esas dos posiciones son el mismo par (`pairId 2`, `artSeed 192387`): el templo con menos ornamento
fue el memorable. Dato para la gramática estética: menos detalle = más recordable.

**Parte 2, consola del laberinto desde compu:** escribió `me siento cansado y confundido` (archivada bien),
invocó `VISION` y `LUNA`, y a la pregunta *"¿Qué temperatura tiene su luz en tu pecho?"* contestó cuatro veces
desde el cuerpo: `es fría` → `tiene frío` → `sufre por el frío` → `incomodidad`. El rito le respondió dos veces
*"Escribe desde el cuerpo, no desde la cabeza"*, dos veces *"Aún no me das nada que replicar"* y luego `...`
y silencio. Bernard: *"Jaja se trabó"*. Reproducido línea por línea con el motor real (vitest, 2026-10-17):

- `StanceClassifier` no tiene en sus léxicos `frío/fría`, `incomodidad`, `cansado`, `confundido`, `sufre`
  → cero señales → `PsychologicalResponseEngine` cae a los OPENERS de presión, que para el jugador suenan a
  "respuesta rechazada" aunque respondió exactamente lo que se le pidió.
- El camino de OPENER no registra turno en `StancePressureTracker`, así que `terminalCore` alimenta a
  `advanceSilence` con el último stance real (`ritualization` de LUNA) y la misma presión durante cuatro turnos
  → `stagnantTurns` 1→4 → `ellipsisOnly` → `...`. El sistema castiga su propia sordera con silencio; viola la
  regla dura 6 (sin castigos, salida clarísima).

Item: `.claude/backlog/rito-rechaza-respuestas-corporales.md` — **Done 2026-10-17**: léxico térmico/corporal en el
clasificador + un opener sin stance ya no alimenta el silencio; sus cuatro frases son tests en tres capas
(`acdfe2d`). Verificado en prod jugando la consola ALPHA con sesión limpia: las cuatro frases reciben espejo
("Lo guardé…", "Te oí. Pesa…"), presión 0 %, sin `...`.

**Cómo se juega la consola en prod desde chrome-devtools (receta que funcionó 2026-10-17):** `laberinto.html` con
`localStorage` limpio; la ruta spawn (4,4) → ALPHA (3,2) se calcula con `generateMaze(8, 8, 1337)` (N, W, N); con
yaw 0, `KeyS` = norte (−z) y `KeyD` = oeste (−x), 1.15 s por celda a `WALK_SPEED` 4; los `KeyboardEvent` sintéticos
en `window` sí mueven al player, la `E` va con `press_key` (el gate de envíos bloquea `dispatchEvent('keydown')`
con KeyE), y la consola se escribe con `type_text` + Enter; el HUD (`node: ALPHA`, `E conectar ALPHA`) y el pie
de la consola (`presión · stance`) son el estado observable.

**Borrador de respuesta para el DM (lo manda Bernard):**
> Ya quedó. Lo que viste no eras tú: el rito no tenía "frío" ni "incomodidad" en su vocabulario, así que tus
> cuatro respuestas le parecieron vacías y encima se calló por "repetirte". Ya reconoce lo corporal y ya no se
> queda mudo. Cuando puedas, vuelve a la consola y escríbele lo mismo: quiero ver qué te contesta ahora. Y lo del
> templo con menos detalles me sirvió un montón.

### Consola: nunca rechaza, nunca repite, siempre mueve (2026-10-17, `53d4178` + `673ef59`)

Punto 1 del item `diversion-con-evidencia.md` (veredicto en `entregables/como-hacer-el-juego-mas-divertido-2026-10-17.html`).
Mecanismo nuevo en `web/src/terminal/psych/`: `replyPool.ts` (12 líneas por stance + catch-all + nag + pivot, datos
tipados con condiciones y placeholders) y `ReplyBag.ts` (shuffle-bag sembrado por sesión: nunca la misma línea dos
veces seguidas, la regla más específica gana y al agotarse baja de nivel). Sin señales, la consola refleja la palabra
del jugador y al segundo turno pivota hacia el objetivo del rito; una respuesta corta a una pregunta corporal cuenta
como confesión; `...` siempre va con un nag y al siguiente turno estancado la consola cambia de tema. El RNG sembrado
vive ahora en `web/src/shared/rng.ts`. Fuera de alcance, a propósito: el modelo no participa en la consola (no hay
endpoint), eso es `ia-psiconauta`.

**Verificado en prod (2026-10-17 10:00, cristal.bernarduriza.com, consola ALPHA, contexto aislado, deploy `d71f1fb`).**
Bundle `laberinto-DbFnfudU.js` contiene las líneas nuevas y ya no contiene "Escribe desde el cuerpo" ni "nada que
replicar". Secuencia exacta del tester: `es fría` → "«me siento cansado y confundido» abrió esta puerta. Esto que dices
la abre más." · `tiene frío` → "Lo guardé. Ahora vive en mí, contigo." · `sufre por el frío` → "Llevas rato aquí
conmigo. Lo que dices ahora pesa distinto que al principio." · `incomodidad` → "No lo arregles. Nada más dime si se
mueve o se queda quieto." Presión 0 %, stance `confession`. Diez turnos seguidos de `no siento nada, da igual`: diez
líneas distintas (la que nombra la confesión, la de presión ≥50 %, las dos de repetición, las genéricas), en el octavo
`...` + "No hace falta decir más. Una palabra que no hayas dicho basta.", en el noveno el pivot "Vamos a otro cuarto.
«me siento cansado y confundido» ya abrió uno; ve a ver qué hizo con ella.", y el décimo vuelve a contestar. Presión
100 %, `anesthesia`. Captura: `~/Documents/personal-assistance/cristal-betatesters/2026-10-17-prod-consola-nunca-repite.jpg`.
Observación menor: tecleando más rápido que el `delayMs` las respuestas retrasadas aparecen después del siguiente echo;
en juego real el retardo las separa.

### Primeros cinco minutos: embudo medido y un verbo a la vez (2026-10-17, punto 3 de `diversion-con-evidencia.md`)

El API vivo es `https://cristal-api.mangobush-0b255aa4.eastus2.azurecontainerapps.io` (el host greendune de la
memoria está muerto; la SWA lo recibe por `VITE_CRISTAL_LLM_URL` en el workflow). Nuevo `POST /telemetry/funnel`
(`server/telemetry.py`): el laberinto reporta una vez por visita los segundos hasta cada paso (laberinto, pointer_lock,
first_step, console_open, first_phrase, glyph_invoked, door_crossed), anónimo. `GET /telemetry/funnel/summary` con
`X-Admin-Token` da sesiones, alcanzados por paso, mediana y caída. En el cliente: `OnboardingHint` ("click para mirar"
→ "W A S D para caminar"), placeholder con ejemplo, HUD `embudo: k/7`.

**Gate de Bernard (`!`, por el `az … create`; el Container App está en `portfolio-rg` / `portfolio-env`, no en `insult-rg` como decían `provision.sh` y la memoria):** `! bash server/telemetry-storage.sh` monta Azure Files en
`/home/runner/telemetry` y fija el secreto `telemetry-token` desde `~/.secrets/cristal-telemetry-token.txt`. Hasta
entonces el JSONL vive solo dentro de la revisión y el resumen contesta 503.

Verificado en prod (deploy `aa42ec1`): `POST /telemetry/funnel` 204 con evento válido, 422 con paso inválido, resumen
503 «CRISTAL_TELEMETRY_TOKEN unset»; en la página, «CLICK PARA MIRAR» visible y `embudo: 1/7` → `2/7` al primer paso
(captura `~/Documents/personal-assistance/cristal-betatesters/2026-10-17-prod-onboarding-hint.jpg`). **Bug encontrado
ahí mismo:** `navigator.sendBeacon` con un Blob `application/json` falla en Chrome con `net::ERR_FAILED` después del
preflight (lo vi en la lista de red de la página: dos beacons muertos); `fetch` con `keepalive` desde la misma página
contesta 204. El reporter quedó solo con `fetch keepalive` (`d024aef`); reverificado en prod con sesión limpia: la lista de red de
la página muestra `POST /telemetry/funnel` 204 al cargar (laberinto) y 204 al primer paso.

Lección de sesión: dos llamadas Bash en la misma respuesta comparten cwd y se pisan los `cd`; rutas absolutas o
`npm --prefix`.

### Densidad de hallazgo: las frases del jugador en los muros (2026-10-17, punto 2 de `diversion-con-evidencia.md`)

Cada frase tecleada en una consola (no los comandos) se escribe en un muro de la celda de esa consola y después en
anillos hacia afuera, con el acento de la consola, atenuada si el stance fue evasivo; persiste en
`localStorage` (`cristal.inscriptions.v1`, tope 24). Un reloj de hallazgos (`DiscoveryClock`: nodo cercano,
inscripción cercana, frase) corre en exploración; a los 60 s sin hallazgo el laberinto escribe un fragmento
deformado de las palabras del jugador («… pesa …») uno o dos anillos adelante. HUD de debug:
`hallazgo: Ns · finds · hambre N`. Verificado en dev (localhost:5173, contexto aislado): «me pesa el pecho» → muro
este de ALPHA, «tengo frío en las manos» → muro oeste (captura
`~/Documents/personal-assistance/cristal-betatesters/2026-10-17-dev-inscripcion-muro.jpg`); 60.2 s quieto →
«… pesa …» en (3,1). **Verificado en prod (deploy `5938ca4`, bundle `laberinto-BqfBLR5e.js`, contexto aislado):**
«me arde la garganta» → muro este de ALPHA, «tengo las manos heladas» → muro oeste, visible desde la cámara de
exploración (`~/Documents/personal-assistance/cristal-betatesters/2026-10-17-prod-inscripcion-muro-2.jpg`), HUD
`hallazgo: 3s · 5 · hambre 0`.

Nota de dev: en localhost el recorrido sintético N,W,N del recetario no llegó a ALPHA (acabó en ROTURA); con el
handle `window.__player.current.set(-2, 0, -6)` el jugador queda en ALPHA directo. Un Vite de otra sesión ya
escuchaba en 5173 (pid 10172, desde el 16 oct): se usa, no se mata.

### Recorrido del homework #1 en prod (2026-10-16, Claude como jugador nuevo)

Arreglado y desplegado (b6f8903 → 08d2aac, verificado en cristal.bernarduriza.com):
- la E que conecta la consola ya no cae dentro del input; el HUD de exploración se oculta con la consola abierta
- el minimapa apunta al nodo del rito donde estás ("ALPHA 3 → 2 → 1 → aquí") y no se pinta dentro de un cuarto
- **el cuarto de IA sí llega**: `cristal-api /generate` tarda 38–54 s (AIRE) y el cliente abortaba a 8 s, así que
  nadie veía un cuarto generado; ahora timeout 90 s, una petición por semilla, prefetch del glifo que señala el mapa
  en cuanto se archiva la confesión y semilla fijada por glifo (la gravedad ritual drifteaba y re-rolaba el cuarto)
- fallback local corta la confesión por palabra con «…»; "one rooms" → "one room"

Observado, sin tocar (decisiones de Bernard): el turno de AIRE para un JSON de 600 chars tarda 40–55 s y se
serializa bajo carga (dos a la vez → 89 s); la bienvenida de la consola y el journal mezclan inglés
("What should the room learn first?", "Mostly confessing…"); con ventana < ~1000 px el journal y el panel del
cuarto se encajan; la integridad drena ~2/s mientras el jugador lee el cuarto.

---

## Completado

### Phase 1-6.3: Core Systems
- [x] Terminal, Memory, StateMachine, Arcana, AI, Vision system
- [x] Scene cleanup: `Labyrinth.unity` (3D) y `CrystalCLI.unity` (2D)
- [x] URP configurado con Universal Renderer 3D
- [x] Prefabs: RitualOperator, TerminalConsole
- [x] Player scripts: Controller, Camera, Interaction, InputHandler
- [x] Input System configurado
- [x] Terminal Visual Config, ScanlineEffect, TerminalFrame
- [x] SVG Export system
- [x] Floating Interact Prompt

### Phase 6.2: Labyrinth 3D
- [x] LabyrinthBootstrap + RuntimeRoomBuilder
- [x] Labyrinth walls working
- [x] LabyrinthAtmosphere (fog, lighting)

### Phase 6.7: Dream Tunnels System
- [x] DreamTunnelSystem - Orquestador principal
- [x] DreamTunnel, DreamRoom, DreamRoomBuilder - Geometria procedural
- [x] DreamRoomDefinition - ScriptableObject arquetipos
- [x] DreamAIOracle - Generacion AI via Ollama/Qwen3
- [x] DreamSymbolProjector - Proyeccion de simbolos procedurales
- [x] DreamMemoryBridge - Persistencia de suenos

### Phase 8: Symbolic Forge System
- [x] ReactiveSystemBus - Pub/sub eventos
- [x] SymbolicForge - Sistema central
- [x] SVGGenerator - Motor procedural
- [x] SymbolicTemplate - Configuraciones
- [x] SymbolicProjection - Display
- [x] SymbolicMemoryLog - Persistencia

### Phase 9: Ritual System
- [x] RitualExecutor - Orquestador
- [x] RitualDefinition - ScriptableObject rituales
- [x] RitualProgressTracker - Persistencia
- [x] SymbolicTrigger - Interacciones mundo
- [x] VisionManager, VisionInstance

---

## En Progreso

- [ ] Descargar Y Bot de Mixamo
- [ ] Descargar animaciones: Idle, Walk, Run, Jump
- [ ] Configurar Animator Controller
- [ ] Reemplazar capsula del jugador con avatar

---

## MCP Servers

| Server | Estado | Uso |
|--------|--------|-----|
| `mcp-unity` | Puerto 8090 | Control Unity Editor |
| `chrome-devtools` | npx | Navegacion web, descargas |

---

## Estructura de Scripts

```
Assets/Scripts/
├── Terminal/           # Sistema CLI 2D
├── Memory/             # Memoria persistente + DreamMemoryBridge
├── StateMachine/       # Estados del juego
├── Arcana/             # Sistema de arcanos
├── AI/                 # Integracion Ollama/Qwen
│   └── Dreams/         # DreamAIOracle
├── Core/               # Bootstrap, ServiceLocator, CristalLog
│   └── Events/         # ReactiveSystemBus
├── Symbolic/           # Sistema simbolico (Phase 8)
├── Ritual/             # Sistema de rituales (Phase 9)
├── Labyrinth/          # Sistema 3D
│   ├── Core/           # LabyrinthManager, LabyrinthBootstrap
│   ├── Dream/          # Dream Tunnels System (Phase 6.7)
│   ├── Atmosphere/     # Fog, lighting, audio
│   └── Environment/    # RuntimeRoomBuilder
└── VFX/                # DreamSymbolProjector
```

---

## Proximos Pasos

### Opcion A: Avatar del Jugador
1. Descargar Y Bot de Mixamo
2. Importar FBX con Humanoid rig
3. Descargar animaciones (Idle, Walk, Run, Jump)
4. Crear Animator Controller
5. Integrar al PlayerController

### Opcion B: Testing Dream Tunnels
1. Crear DreamRoomDefinition assets
2. Configurar triggers de arcana
3. Probar generacion AI con Ollama
4. Verificar proyeccion de simbolos

### Opcion C: Contenido Ritual
1. Crear RitualDefinition assets
2. Colocar SymbolicTriggers en escena
3. Disenar secuencias de rituales
4. Probar sistema completo

---

## Comandos Unity Editor

```
CRISTAL > Setup 2D Terminal Scene
CRISTAL > SVG Export Window
CRISTAL > Create Terminal Visual Config
CRISTAL > Dream > Room Definition
CRISTAL > Floating Prompt > ...
CRISTAL > Start/Stop Play Mode
```

---

## Notas

- Unity 6 (6000.3.2f1) con URP
- Ollama local para AI (qwen3:8b)
- Git: commits atomicos, mensajes claros
