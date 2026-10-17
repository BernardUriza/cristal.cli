# Fuente: diseño del corpus de sustancias para la IA-Psiconauta (ChatGPT, pegado por Bernard 2026-10-17)

Texto pegado por Bernard en la sesión de Claude Code del 2026-10-17 con la pregunta «falta el corpus de
sustancias, no? para ia la que es usada bajo sustancias». Es propuesta de ChatGPT; lo que Bernard adoptó al
pegarlo es la pregunta y el encuadre: orientación, reducción de riesgos e integración, nunca instructor de consumo.

## 1. Las 10 bibliotecas del corpus
1. Sustancias: identidad química, nombres, familias, metabolitos, farmacología, clasificación.
2. Neurociencia: receptores, neurotransmisores, redes, percepción, límites de las explicaciones.
3. Efectos y temporalidad: inicio, evolución, duración, efectos físicos/cognitivos/perceptivos, variabilidad.
4. Interacciones: medicamentos, otras sustancias, enfermedades, contraindicaciones, niveles de evidencia.
5. Riesgos y urgencias: signos de alarma, intoxicaciones, adulteración, complicaciones, criterios de atención médica.
6. Fenomenología: disolución del yo, alteraciones temporales, sinestesia, ansiedad, experiencias místicas.
7. Psicología: regulación emocional, grounding, acompañamiento no directivo, consentimiento, apoyo en crisis.
8. Integración: reflexión posterior, diarios, significado personal, cambios de conducta, seguimiento.
9. Investigación clínica: ensayos, revisiones sistemáticas, resultados, limitaciones, poblaciones.
10. Epistemología y ética: hechos vs hipótesis vs testimonios vs metáforas vs interpretaciones. «La IA nunca
    debería presentar una interpretación personal como si fuera un descubrimiento científico.»

## 2. Familias y sustancias iniciales
Psicodélicos clásicos (LSD, psilocibina, psilocina, DMT, mescalina); triptaminas y fenetilaminas (4-AcO-DMT, 2C-B);
disociativos (ketamina, DXM, PCP); empatógenos (MDMA, MDA); cannabinoides (THC, CBD, sintéticos); estimulantes
(cocaína, anfetaminas, metanfetamina); depresores (alcohol, benzodiacepinas, GHB); opioides (morfina, oxicodona,
fentanilo, heroína); delirantes y otros (datura, escopolamina, salvia divinorum); medicamentos relevantes
(antidepresivos, antipsicóticos, estabilizadores, estimulantes prescritos).
**Primera versión: LSD, psilocibina, DMT, MDMA, ketamina y cannabis + sus interacciones relevantes.**

## 3. Ficha estructurada por sustancia
Identidad, familia, mecanismo principal, efectos, riesgos, interacciones (registros separados por medicamento,
mecanismo, evidencia y gravedad), procedencia (documentos identificables y fechados). Cada afirmación con
`source_id`, fecha de publicación, fecha de revisión, tipo de estudio, población, nivel de confianza y
contradicciones con otras fuentes.

## 4. Cuatro tipos de conocimiento, nunca mezclados
Evidencia experimental · descripción fenomenológica · interpretación psicológica o filosófica · testimonios
comunitarios (útiles, no evidencia clínica). La FDA publicó en julio de 2026 una guía final sobre investigación
clínica con psicodélicos.

## 5. Arquitectura
Corpus documental versionado → RAG semántico (explicaciones y citas) → base estructurada (sustancias, relaciones,
interacciones) → motor de evaluación de seguridad (urgencias, contraindicaciones, incertidumbre, derivación) →
IA-Psiconauta (respuesta contextual, prudente, con fuentes). El motor de seguridad no depende de lo que recuerde el
modelo: reglas verificadas para convulsiones, pérdida de conciencia, dificultad respiratoria, hipertermia,
agitación extrema, confusión grave → atención urgente. Reglas contra diagnósticos improvisados, recomendaciones de
mezclas, curación garantizada y validación de delirios. Sustancia no identificada → no fingir que se conoce.

## 6. Fuentes base
NIDA (farmacología, efectos, riesgos), NCCIH (evidencia y límites con psilocibina), guía clínica de la FDA
(estándares de investigación y seguridad), PubMed, revisiones sistemáticas, toxicología clínica. Erowid y
PsychonautWiki como colección separada de testimonios, nunca mezclada con evidencia médica.

Meta de diseño v1: seis sustancias, 30–50 interacciones prioritarias por toxicología clínica, protocolos de
urgencia revisados profesionalmente, biblioteca fenomenológica etiquetada. «Qué sabemos, cómo lo sabemos, qué está
en disputa y cuándo es mejor dejar de interpretar para priorizar la seguridad.»
