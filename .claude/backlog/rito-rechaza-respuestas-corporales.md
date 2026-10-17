# El rito rechaza respuestas corporales legítimas y luego se calla

Status: Done (fix en prod 2026-10-17, `acdfe2d`; la decisión sobre `...` sin salida se cerró en `673ef59`: nunca solo, ver `diversion-con-evidencia.md`)
Proposed: 2026-10-17 by me.tikkum (betatester, DM Instagram 2026-10-16 23:41) — destilado por Claude

**Qué es.** El primer betatester hizo exactamente lo que el rito pidió y el rito lo trató como si no
hubiera contestado. A *"¿Qué temperatura tiene su luz en tu pecho?"* respondió `es fría`, `tiene frío`,
`sufre por el frío`, `incomodidad`. Recibió dos veces *"Escribe desde el cuerpo, no desde la cabeza"*,
dos veces *"Aún no me das nada que replicar"* y después `...` para siempre. Bernard: *"Jaja se trabó"*.
Evidencia: `~/Documents/personal-assistance/cristal-betatesters/2026-10-16-me-tikkum-consola-se-trabo.png` (fuera del repo público); registro en `Donde_quedamos.md`.

**Causa, reproducida con el motor real (vitest, 2026-10-17).** Dos defectos que se componen:

1. `web/src/terminal/psych/StanceClassifier.ts` — los léxicos `BODY_TERMS` / `EMOTION_TERMS` no tienen
   `frio/fria`, `calor`, `incomodidad`, `incomodo`, `cansado`, `cansancio`, `confundido`, `sufre/sufrir`,
   `tenso`, `pesado`… Cero señales → `PsychologicalResponseEngine.generateCristalPsychReply` devuelve un
   OPENER de presión. El jugador lee "no me entendió / me rechazó".
2. `web/src/terminal/terminalCore.ts` + `SilenceEngine.ts` — el camino OPENER no registra el turno en
   `StancePressureTracker`; `advanceSilence` recibe el stance anterior (`ritualization` de LUNA) con la misma
   presión cuatro veces → `stagnantTurns` 4 → `ellipsisOnly` → `...`. El silencio está diseñado para castigar
   al jugador que se repite; aquí castigó al jugador por la sordera del clasificador.

**Por qué importa.** Regla dura 6 (`.claude/rules/reglas-duras-del-juego.md`): público en estado alterado,
sin castigos, salida clarísima. Un `...` sin salida después de cuatro respuestas honestas es el peor caso
posible para ese público.

**Canónico a reusar.** El motor ya existe; no se reescribe. Ampliar léxicos del clasificador (con tests en
`StanceClassifier.test.ts` usando las cuatro frases del tester tal cual), y en el camino OPENER o registrar un
stance neutro en el tracker o no alimentar `advanceSilence`. Sensaciones térmicas (`frío`, `calor`, `tibio`)
cuentan como cuerpo: la pregunta del rito las pide explícitamente.

**La decisión de Bernard.**
- Si el clasificador por léxico sigue siendo el camino, o si una frase corta sin señales debe ir al modelo
  (`cristal-api`) en vez de a un OPENER fijo — la regla dura 2 permite usar el modelo para decidir.
- Si `...` puede existir como respuesta terminal sin una salida visible (regla 6), o siempre debe ir
  acompañado de un prompt de escape.

**Hecho (2026-10-17, `acdfe2d`).** 1 y 2 corregidos con sus cuatro frases como tests en tres capas
(`StanceClassifier.test.ts`, `PsychologicalResponseEngine.test.ts`, `terminalCore.integration.test.ts`);
los seis tests fallan en el HEAD anterior y pasan con el fix. El `...` sin salida se cerró el mismo día en `673ef59`: siempre va acompañado de un nag y al turno estancado siguiente la consola cambia de tema (Short 2009, Façade); la evidencia está en `diversion-con-evidencia.md`.

**Verificado en prod (2026-10-17 09:25, cristal.bernarduriza.com, consola ALPHA, sesión limpia).** La secuencia
exacta del tester: `es fría` → "Lo guardé. Ahora vive en mí, contigo." · `tiene frío` → ídem · `sufre por el frío` →
"Te oí. Pesa. Déjalo pesar un poco más." · `incomodidad` → ídem. Presión 0 %, stance `confession`, ningún opener,
ningún `...`. Captura: `~/Documents/personal-assistance/cristal-betatesters/2026-10-17-prod-consola-arreglada.jpg`.
Observación menor: las variantes se repiten por pares porque el hash del input elige entre tres; no es el bug.

**Next.** Contestarle a `me.tikkum` por el DM (borrador en `Donde_quedamos.md`) y pedirle que repita la consola.
