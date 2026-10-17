# Corpus psiconáutico de CRISTAL — esquema v1

Regla dura 5 del juego: el corpus es un RAG propio. Fuente del diseño: `.claude/backlog/fuente-chatgpt-corpus-psiconautico-2026-10-17.md`.
Propósito: orientación, reducción de riesgos e integración para alguien que YA consumió. Nunca instructor de consumo.
Cuatro tipos de conocimiento, nunca mezclados: `evidencia` · `fenomenologia` · `interpretacion` · `testimonio`.
Toda afirmación lleva `fuentes: [source_id]`; una afirmación sin fuente no entra al corpus.

## sustancias/<id>.yml

```yaml
id: lsd
nombres: [LSD, dietilamida del ácido lisérgico, ácido]
familia: psicodelico-clasico          # psicodelico-clasico | triptamina | fenetilamina | disociativo | empatogeno | cannabinoide | estimulante | depresor | opioide | delirante
identidad:
  quimica: "dietilamida del ácido lisérgico (ergolina)"
  fuentes: [nida-lsd-2024]
mecanismo:
  texto: "agonista parcial 5-HT2A; actividad serotoninérgica"
  limites: "la relación entre receptor y experiencia subjetiva no está cerrada"
  fuentes: [...]
temporalidad:                         # minutos; rangos documentados, nunca un número suelto. Puede ser una LISTA de entradas con `via:` (inhalado, comestible, fumado, ayahuasca)
  inicio: [20, 90]
  pico: [120, 240]
  duracion: [480, 720]
  fuentes: [...]
efectos:
  - { tipo: perceptivo | cognitivo | fisico | emocional, texto: "...", fuentes: [...] }
riesgos:
  - { texto: "...", gravedad: leve | moderada | grave, fuentes: [...] }
senales_de_urgencia:                  # lo que dispara derivación médica inmediata; se cruza con urgencias/
  - { texto: "...", fuentes: [...] }
investigacion:
  - { texto: "qué se ha estudiado y con qué límites", tipo: ensayo | revision | observacional, poblacion: "...", fuentes: [...] }
fenomenologia:                        # descripciones documentadas; NO universales
  - { texto: "...", fuentes: [...] }
acompanamiento:                       # qué ayuda a quien ya consumió (grounding, entorno, tiempo), con fuente
  - { texto: "...", fuentes: [...] }
contradicciones:                      # desacuerdos entre fuentes, explícitos
  - { texto: "...", fuentes: [...] }
fuentes:
  - id: nida-lsd-2024
    titulo: "..."
    organismo: NIDA | NCCIH | FDA | PubMed | revista | toxicología | comunidad
    url: https://...
    publicado: 2024-03-01
    revisado: 2026-10-17            # fecha en que se leyó para este corpus
    tipo: ficha-oficial | guia | revision-sistematica | revision | ensayo | observacional | prensa | testimonio
    confianza: alta | media | baja
```

## interacciones/<sustancia>.yml

```yaml
sustancia: lsd
interacciones:
  - con: litio
    clase: medicamento
    mecanismo: "..."
    riesgo: "..."
    gravedad: grave | moderada | leve | desconocida
    evidencia: alta | media | baja | reportes-de-caso
    fuentes: [...]
fuentes: [...]
```

## urgencias/senales.yml

Reglas verificadas que el motor aplica ANTES del modelo: patrón de texto → señal → acción (`urgente` = decir
que busque ayuda médica ya y cómo; `atencion` = quedarse, grounding, no quedarse solo). Cada regla con fuente.

## fenomenologia/<tema>.yml

Disolución del yo, tiempo, sinestesia, ansiedad, místico: descripciones documentadas con fuente y etiqueta
`tipo: fenomenologia | testimonio`; nunca como evidencia.

## Prohibido en el corpus
Dosis recomendadas, cómo conseguir, cómo combinar para potenciar, afirmaciones de curación, diagnóstico. Si una
fuente las trae, no se copian. Testimonios (Erowid, PsychonautWiki) van etiquetados `testimonio` y en su carpeta.
