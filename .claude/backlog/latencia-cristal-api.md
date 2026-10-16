# Latencia de cristal-api /generate: 40–55 s por cuarto, serializado bajo carga

Status: Proposed
Proposed: 2026-10-16 by Claude (medido jugando el homework del betatester en prod)

**Qué es.** `server/runner.py` manda cada cuarto como un turno de AIRE (`default_mode="complete"`,
`CRISTAL_MODEL` claude-sonnet-4-5). Medido el 2026-10-16: 39.8 s, 37.8 s, 45.1 s, 53.7 s por petición;
dos peticiones concurrentes → 89 s. El JSON de salida pesa ~600 chars. El cliente ya lo tapa con prefetch
y timeout de 90 s, pero el jugador que se desvía del glifo sugerido espera ese tiempo en "reescribiendo el cuarto".

**Canónico a reusar.** `server/runner.py` (fi-runner + AIREBackend); `server/prompts/persona.md`.

**Decisión de Bernard.** Dónde se gana el tiempo: en AIRE (sesión/casita por turno) o pidiendo el cuarto
por Messages API directo con un modelo rápido, fuera del agente. Y si vale prefetch de los tres glifos
(3× costo por confesión, concurrencia en AIRE).

**Next.** Medir en AIRE cuánto del turno es overhead vs generación; decidir.
