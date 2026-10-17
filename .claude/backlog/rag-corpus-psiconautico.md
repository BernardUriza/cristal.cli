# RAG propio sobre sustancias y percepción

Status: In progress (v1 en prod 2026-10-17: 6 sustancias + cafeína, interacciones, señales de urgencia; faltan biblioteca de fenomenología, integración y revisión profesional de las urgencias)
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Corpus que mapea sustancia/camino → visión, percepción o alteración conocida; de ahí parte la
premisa psicológica de cada pregunta. Bernard [194], [221]. ChatGPT: separar tres conocimientos
(farmacológico, fenomenológico, interpretación personal; el tercero nunca como verdad del RAG) y nunca
tomar decisiones conductuales duraderas intoxicado [222].

**Canónico a reusar.** El server de `cristal-api` (ver `server/`); el pipeline RAG que ya exista en los
repos de Bernard antes de armar uno nuevo (Art. 6).

**Decisión de Bernard.** Fuentes del corpus y dónde vive (no en este repo si trae datos sensibles).

**Ya aterrizado (`5984d9e`, 2026-10-17).** Diseño completo de ChatGPT pegado por Bernard en
`fuente-chatgpt-corpus-psiconautico-2026-10-17.md` (10 bibliotecas, 4 tipos de conocimiento, ficha por sustancia,
motor de seguridad antes del modelo). Esquema en `server/corpus/SCHEMA.md`; fichas YAML en `server/corpus/sustancias/`
(LSD, psilocibina, DMT/ayahuasca, MDMA, ketamina, cannabis; cafeína y bebidas energéticas en curso), 37 interacciones
en `interacciones/`, 10 señales en `urgencias/senales.yml` con la línea a decir (911; Línea de la Vida 800 911 2000
verificada en gob.mx 2025-10-23). Motor `server/corpus.py`: detecta sustancia por nombre o caló, aplica señales de forma
determinista antes del modelo, contexto corto con fuentes para la voz de la consola (`/console/turn`), `GET
/corpus/sustancias`, `POST /corpus/check`. Test que recorre el corpus real: toda afirmación con fuente declarada.
Verificado en prod: «tacha + ya no suda, está ardiendo» → MDMA + hipertermia urgente con su línea.

**Huecos declarados por los investigadores (no inventados):** EUDA/EMCDDA devolvió 403 en todas las fichas; varias
fichas FDA y PubMed se leyeron solo como extracto; temporalidad de psilocibina con confianza baja (reconfirmar con Brown
2017); sin fuente oficial para el pico subjetivo del LSD; interacciones de tramadol con ayahuasca/MDMA son inferencia
mecanística marcada `evidencia: baja`.

**Decisión de Bernard.** Quién revisa profesionalmente las 10 señales de urgencia antes de que el juego se ofrezca a
alguien en viaje (el diseño lo pide: "protocolos de urgencia revisados profesionalmente").

**Next.** Bibliotecas que faltan: fenomenología transversal, integración (diario, seguimiento en sobrio), psicología
(grounding); epistemología como regla de voz; reabrir EUDA con otra superficie.
