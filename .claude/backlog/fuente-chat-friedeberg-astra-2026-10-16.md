# Fuente: chat ChatGPT "friedeberg astra" (https://chatgpt.com/c/6acc857a-61f0-83e8-94f0-0d5f536cbb6b), turnos [188/237]–[237/237], 2026-10-14 → 2026-10-16. Destilado 2026-10-16; los items del backlog citan `[n/237]` contra este archivo.

Dump original: 237 turnos (la primera mitad es logística de viaje y arte, no se destiló). Solo la segunda mitad (videojuego). Los turnos de Bernard son dictados por voz; se citan tal cual. "ChatGPT" = el asistente del chat. "Fable" = el Claude que Bernard tiene trabajando en el repo (su reporte aparece pegado en [229]).

Nota de contexto: en todo el chat el juego nunca se nombra como CRISTAL.CLI. Bernard lo describe como "un videojuego de laberintos con IA acompañante" y la pantalla interna como `2d.cli`. ChatGPT solo conoce ese nombre.

---

## 1. Ideas concretas

### 1.A — REGLAS DURAS declaradas por Bernard

1. **Cero IA generativa de imágenes.** "Una regla dura que yo creo que vamos a meter para el videojuego es que vamos a usar cero IA generativa de imágenes. O sea, se va a anunciar como una inteligencia artificial, pero que solamente usa lenguaje y modelo para tomar decisiones. Pero podemos utilizar vectores, líneas cartográficas y toda la ingeniería de la arquitectura en 2D para generar los cuadros." — Bernard [217/237].

2. **No tocar los guardrails del modelo.** "sí actúe de la misma manera que ya actúa el modelo de lenguaje predeterminado escogido. O sea, no quiero cambiar ni atentar contra ninguna de las guardrails ya creadas." — Bernard [194/237].

3. **Estudiar los principios estéticos de Friedeberg, no reproducir obras.** ChatGPT planteó la distinción (principios vs obras protegidas) en [218]; Bernard eligió explícitamente "estudiar sus principios estéticos" — Bernard [219/237].

4. **El motor proyecta geometría 2D para simular profundidad y permitir caminar.** Ante la pregunta "¿ilustración 2D navegable o motor que proyecta 2D para caminar?" Bernard contestó: "el motor proyecte geometría 2D para simular profundidad y permitir caminar por esos espacios" — Bernard [219/237].

5. **El corpus sobre LSD es un RAG propio, más certero que la IA genérica.** "el corpus sobre el lsd que puedo conseguir puede ser mucho más certero que el que la IA genérica tiene. Es un rag que toma decisiones…" — Bernard [221/237].

6. **Público objetivo: gente en LSD que quiera jugar en LSD.** "ese juego va a ser en especial para gente que está en el SD y quiera jugar en el SD" (dictado; "SD" = LSD) — Bernard [192/237].

7. **Conocimiento arquitectónico real, no líneas rectas.** "me falta darle MUCHO conocimiento de arquitectura porque Pedro sabia de eso y los edificios quedaban bien planificados, no eran simples lineas rectas, eran dibujos isometricos de mapas que pudieron ser reales.." — Bernard [231/237].

8. **Arquitectura de código: pocos LOC por módulo, dumb components, config files.** Pide a Fable "que use Three.js, SVG, Canvas 2D, GLSL Shaders en lo que ya ha hecho y lo haga refactorizando bien las capas del codigo usando escasos LOCs por modulo con dump components y configfiles" — Bernard [229/237].

### 1.B — IDEAS de Bernard (no formuladas como regla)

9. **IA psiconauta.** "una IA psiconauta para ayudar a los que ya consumieron lsd al menos no se pierdan en si mismos si se sienten solos" — Bernard [190/237]. Origen: idea de la noche anterior en San Miguel, no anotada por estar con Juan Carlos [188].

10. **Juntar laberinto + Friedeberg + IA acompañante.** "podemos juntar las dos, siempre. De hecho ya tengo empezado un videojuego que justamente combina… laberintos con inteligencia artificial como acompañante… y posibilidad de chatear con ella. Entonces ya estamos poniéndole más información de cómo queremos el arte con Pedro y sobre qué va a estar informada también la IA" — Bernard [192/237].

11. **Preguntas que aprovechan el estado alterado, ancladas en conversaciones previas.** No tranquilizar: "utilizar otro tipo de psicología de que ayude a sacarle provecho al estado psiconáutico con preguntas como por ejemplo: ahora que estás en ese estado puedes ver X o Y de lo que habíamos hablado previamente" — Bernard [194/237].

12. **El corpus mapea sustancia/camino → visión/percepción/alteración conocida, y de ahí parte la premisa de la pregunta.** "el mismo centro de datos de la documentación ya va a proveer el corpus una buena identificación de cosas como qué camino o qué sustancia provoca cuál visión o percepción o alteración conocida y de ahí partir con la premisa psicológica de la pregunta" — Bernard [194/237].

13. **Enseñar al psiconauta experimentado a usar la sustancia como herramienta, vía micro-momentos de juego elegidos por la IA.** "enseñarle a usar al psiconauta experimentado a usar bien la sustancia como herramienta con conocimiento completo de consecuencias y cambios de conducta por entendimientos profundos vividos en pequeños momentos de juego en el mundo elegido por la IA" — Bernard [221/237]. (ChatGPT corrigió su lectura previa de "reducción de daño" a "acompañamiento epistemológico y conductual".)

14. **Lenguajes abstractos / seres mitológicos por combinación conceptual.** Combinar dos conceptos aparentemente incoherentes ("colonialismo psicológico") que tienen "una conjunctura bastante técnica y lineal" y producen un ser tipo Friedeberg: "una cebra puede tener la cabeza de un ser humano siendo diseccionado" — Bernard [196/237].

15. **Neobarroco kitsch como etiqueta del lenguaje visual.** "El decía que su arte era neobarrocokitch" — Bernard [213/237]. ChatGPT confirma que Friedeberg usaba el término y lo propone como fundamento: "puedes crear un lenguaje visual coherente sin exigir que cada cebra, columna o criatura represente necesariamente una tesis" [214].

16. **El significado no lo controla el autor (la silla-mano).** "Porque los artistas nunca aceptan su obra? Como Pedro que decía 'las pinches sillas no significaban nada' como realmente sucede que creó un símbolo eterno" — Bernard [211/237]. Lección para el juego (ChatGPT [212]): la obra no es infinitamente interpretable ni encerrada en la intención.

17. **Primer cuadro procedural: Python + SVG + Claude.** "como hacer un cuadro de friederberg sencillo, con python svg y claude" — Bernard [223/237]. Fable lo ejecutó y Bernard mostró el resultado: "hizo esto mira" — Bernard [225/237].

18. **Ampliar el arsenal de dibujo más allá de SVG/HTML.** "ademas de svg, y digamos, html crudo, que otra cosa puede dibujar en pantalla... que usan los artistas modernos?" — Bernard [227/237].

19. **Minijuegos originales dentro del universo.** "Dame ideas de minijuegos divertidos y originales inspirados en lo que me conoces" — Bernard [236/237] (la lista la da ChatGPT, ver 1.C).

20. **Proyecto hermano: periodismo de guerrilla con datos duros, de inmobiliarias a museos.** "esta estructura de antiinmobiliaria… periodismo de guerrilla contra desarrollos de bienes raíces… si esta crítica y estructura puede también ser trasladada a recibos verificables y datos sin inferencias, pero duros sobre la Industria de los museos" — Bernard [197/237]. No es del juego, pero ChatGPT lo liga al juego en [198] (criatura "con cuerpo de museo, cabeza de banco") y en [237] (minijuego "Plusvalía Simulator").

### 1.C — SUGERENCIAS de ChatGPT

**Diseño / principios**

21. **La arquitectura imposible como mecánica, no decoración.** "la arquitectura podría ser parte de las mecánicas del juego, no solamente su decoración" — ChatGPT [189/237].

22. **Núcleo conceptual: "un entorno vivo donde perderte no sea igual a estar solo".** Laberinto = metáfora del viaje mental; la IA = guía + acompañante + orientación + ancla — ChatGPT [193/237].

23. **Tres capas: juego / compañía / seguridad.** Exploración y símbolos; IA conversacional con memoria breve de sesión; pausa, salida, grounding, volver al centro, contactar a alguien, bajar intensidad — ChatGPT [193/237].

24. **Diseño compasivo para estado alterado.** Interfaz limpia, textos grandes, poco ruido, sin castigos, sin jumpscares, sin timer, sin "perdiste", sin sobrecarga verbal, salida clarísima; el juego puede degradarse a caminata / conversación / sala suave / guía respiratoria — ChatGPT [193/237].

25. **Laberinto vivo con "núcleo" al que siempre se puede volver.** Habitaciones que cambian según estado, puertas según interacción, zonas calmantes/juguetonas/intensas, botón de regreso al centro — ChatGPT [193/237].

26. **"Sitting, not guiding" (Zendo Project) como filosofía de la IA.** Acompañar sin dirigir; la IA ofrece posibilidades de exploración, nunca atribuye autoridad especial al estado alterado — ChatGPT [195/237].

27. **Distinción fundamental: ofrecer herramientas vs apropiarse de la dirección de la experiencia.** "Un laberinto donde alguien puede perderse voluntariamente y regresar cuando quiera es un juego. Un laberinto que intenta conducir sus pensamientos hacia determinadas conclusiones ya es otra cosa." — ChatGPT [195/237].

28. **Tres tipos de conocimiento separados en el RAG.** Farmacológico, fenomenológico, interpretación personal; los dos primeros con literatura, el tercero nunca como verdad del RAG. Decisiones conductuales duraderas no se toman intoxicado — ChatGPT [222/237].

29. **Integración posterior (sobrio).** Guardar voluntariamente observaciones, dibujos, preguntas; la IA pregunta después "¿esta idea todavía te parece interesante?" — ChatGPT [195/237], retomado en [222].

30. **La IA se calla si el jugador solo quiere caminar.** "un buen acompañante también sabe no interrumpir" — ChatGPT [195/237].

31. **Sentido vs estructura.** "Friedeberg no necesita que su universo tenga sentido para que tenga estructura": laberinto lógico computacionalmente, absurdo visualmente — ChatGPT [216/237].

32. **Tres operaciones visuales programables: hibridación, variación, acumulación.** Extraídas de las obras que Bernard mostró [215] — ChatGPT [216/237].

33. **Personaje cuya anatomía es arquitectura.** Brazos como pasillos, rostros como ventanas a otras habitaciones (de la "criatura de trece rostros") — ChatGPT [216/237].

34. **Diagramas imposibles como interfaz de conocimiento.** Habitaciones con diagramas que relacionan conceptos/recuerdos, "una interfaz de conocimiento disfrazada de arte surrealista"; conecta con la IA psiconauta — ChatGPT [216/237].

35. **"CALMA" en medio de la saturación.** Observación sobre la obra de Friedeberg: una palabra que pide tranquilidad en una ciudad al borde del colapso geométrico; funciona como contraste — ChatGPT [216/237].

**Arquitectura técnica**

36. **Pipeline: IA conversacional → motor de decisiones → generador espacial + gramática visual → renderizador vectorial.** El LLM pide "sala con ocho columnas y simetría radial"; el motor valida y ejecuta — ChatGPT [218/237].

37. **Habitación como documento estructurado (JSON) con seed.** `roomId`, `geometry`, `architecture`, `navigation.safeReturn`, `rendering.generativeImages: false`; reproducibilidad por semilla + versión del motor — ChatGPT [218/237].

38. **Cinco sistemas geométricos iniciales.** Laberintos (grafos), fachadas (gramáticas de formas), ornamentos (teselaciones/simetrías), perspectiva (proyecciones), criaturas híbridas (módulos vectoriales articulados) — ChatGPT [218/237].

39. **Biblioteca de motivos y reglas artísticas, no solo aleatoriedad.** Riesgo: "protector de pantalla espantosamente genérico"; importan dónde interrumpir un patrón, cuándo meter una figura absurda, cuándo dejar vacío — ChatGPT [218/237].

40. **Capa nueva sobre lo existente: "gramática estética procedural".** No reescribir el motor Three.js; añadir la capa artística y la conversacional — ChatGPT [220/237].

41. **Tabla principio → implementación.** Repetición obsesiva → instancing; ornamentación barroca → capas vectoriales; arquitectura contradictoria → transformaciones controladas; hibridación → composición modular; simetría interrumpida → reglas con excepciones; perspectivas imposibles → portales/cambios de escena — ChatGPT [220/237].

42. **`2d.cli` como terminal dentro de la habitación con acciones validadas.** `inspectRoom`, `openPassage`, `changePattern`, `returnToHub`, `saveReflection`; "El LLM propone acciones; tu motor comprueba permisos y ejecuta únicamente operaciones conocidas" — ChatGPT [220/237].

43. **Siguiente paso concreto: una sola habitación experimental neobarroca conectada a un `2d.cli`.** No un framework procedural gigante — ChatGPT [220/237].

44. **Primer templete: cinco reglas.** Simetría bilateral, repetición modular, contraste negro/dorado, arquitectura clásica deformada, una anomalía absurda (ojo en la cúpula) — ChatGPT [224/237]. Siguiente experimento: 20 variaciones del mismo templete con una gramática.

45. **Jerarquías de detalle (multiescala), no más detalle.** Crítica a la v1 de Fable: "escenario de videojuego retro con decoración neobarroca"; pide tres escalas de complejidad, eliminar vacíos, repetición con anomalías, perspectiva en fachadas, densidad controlada — ChatGPT [226/237].

46. **Versionar cuadros con misma seed (`temple_v001`).** Conservar versiones y comparar con la misma semilla para ver si cada regla mejora o solo suma polígonos — ChatGPT [226/237].

47. **Stack recomendado y roles.** Three.js esencial (navegable), SVG alta (ornamentos editables), Canvas 2D alta (procedural + `2d.cli`), GLSL alta (materiales/patrones GPU), p5.js opcional, Houdini/TouchDesigner baja — ChatGPT [228/237].

48. **Paredes que cambian de patrón sin cambiar colisiones.** Shaders + geometría vectorial: "Un pasillo podría conservar sus colisiones y dimensiones mientras sus paredes se cubren de patrones recursivos" — ChatGPT [228/237].

49. **Una gramática, múltiples renderizadores; dominio no importa renderizadores.** Capas Domain/Geometry → Application → Renderers → Presentation → Configuration; módulos 40–120 LOC; config tipada (`seed, density, complexity, anomalyRate, palette, symmetry, projection, lod, renderBackend, shaderPreset`) — ChatGPT [230/237] (prompt completo para Fable).

50. **Precaución: no forzar una representación intermedia universal.** Una curva 2D y una malla 3D pueden compartir reglas pero no la misma estructura de datos; meta real: "reducir el costo de modificar una regla artística sin tener que tocar cuatro renderizadores" — ChatGPT [230/237].

51. **Secuencia obligatoria para generar edificios: programa espacial → planta → volumetría/estructura → proyección → lenguaje arquitectónico → ornamentación → render.** "El ornamento debe llegar al final, no al principio" — ChatGPT [232/237].

52. **Seis conocimientos arquitectónicos para el motor.** Planimetría; geometría descriptiva/axonometría; tratados y proporción (órdenes, módulo); lógica estructural; urbanismo/cartografía; geometría ornamental histórica — ChatGPT [232/237].

53. **RAG de arquitectura (Vitruvio, Palladio, A Pattern Language, Ching, Venturi) solo para recuperar principios; la geometría la calculan algoritmos deterministas.** — ChatGPT [232/237].

54. **Primer experimento obligatorio: edificio con patio central, galería de arcos, cuatro torres, cubierta ornamentada → planta, alzado, sección, axonometría isométrica y vista Three.js del MISMO modelo.** Después variante neobarroca con anomalía explícita — ChatGPT [232/237]. Criterio de éxito [233]: mover una puerta en el modelo la mueve en todas las vistas.

55. **Anomalía = transformación explícita del modelo, no error de proyección.** Distinguir anomalías de modelo vs dependientes del punto de vista — ChatGPT [232/237], [233/237].

56. **Tres correcciones a la auditoría de Fable.** Coherencia arquitectónica ≠ edificabilidad (validación heurística); la igualdad de una matriz de proyección entre SVG y Three.js debe probarse, no asumirse; resolver el refactor paralelo de `web/src/graphics/` antes de tocar módulos compartidos — ChatGPT [233/237].

57. **Un edificio que es mapa, ilustración, laberinto y espacio habitable a la vez.** La axonometría como representación de información espacial, no efecto — ChatGPT [232/237].

**Minijuegos (ChatGPT [237/237]; criterio: "las reglas mismas sean el chiste, el misterio o el enemigo")**

58. **El arquitecto mentiroso** — construir un edificio que parece coherente desde una cámara y se delata desde otra; un inspector cambia de perspectiva. Marcado "mi favorito para tu motor".
59. **Plusvalía Simulator: el metro cuadrado infinito** — subdividir departamentos sin aumentar volumen; el anuncio los llama más exclusivos; el edificio se rebela.
60. **La ventanilla 666** — laberinto burocrático; se gana hallando la regla absurda que invalida el procedimiento.
61. **El zoológico sin jaulas** — desmontar recintos; cada especie atraviesa el mundo distinto; aprender sus capacidades, no usarlas como herramientas.
62. **La escalera que te contradice** — escaleras que cambian según el observador; algunas soluciones solo funcionan si dejas de mirar.
63. **El museo de las certezas falsas** — apostar si un patrón cumple una regla; la sobreconfianza vuelve los ejemplos más engañosos; se puede pedir más observaciones.
64. **El bibliotecario de recuerdos falsos** — biblioteca que cambia por visita; reconstruir versiones; tu diario también puede estar mal; evidencia = diffs entre snapshots (seeds).
65. **El reloj que se alimenta de planes** — planear demasiado acelera el reloj; improvisar demasiado te pierde.
66. **Juicio a la realidad** — tribunal absurdo de objetos (puerta demanda a muro); se juega en `2d.cli` con lógica argumentativa.
67. **El urbanista de lo imposible** — ciudad plegada; objetivo: que todos los habitantes puedan desplazarse.
68. **El teatro de los finales inevitables** — un narrador anuncia el final; tú solo mueves escenario; ganas con un desenlace que su guion no explica.
69. **El astrónomo de las cosas que no existen** — constelaciones al alinear mapas incompatibles; las estrellas son ventanas del propio laberinto.
70. **Minijuegos conectados al mundo: cada uno enseña una regla del universo que luego se usa afuera.** Entrar a un cuadro, resolverlo, y una escalera del edificio principal adopta la regla descubierta — ChatGPT [237/237].

---

## 2. Lo que Bernard dijo que YA existe en su juego

- [192/237]: "ya tengo empezado un videojuego que justamente combina la idea de tener un videojuego de laberintos con inteligencia artificial como acompañante, este, y posibilidad de chatear con ella."
- [219/237]: "Ya tengo todo un sistema de unityalike pero uso Three.js"
- [219/237]: "Creo avatares en laberinto y movimiento dentro. Además de algunas partes ya construidas que permiten al jugador tener secciones donde se enfrenta a una pantalla y es lo que le llamamos en mi juego el 2d.cli"
- [219/237]: "Pero básicamente ya es una interfaz normal con JavaScript plano"
- [225/237]: "hizo esto mira ---" (adjunto: primer templete SVG generado por Fable con Python).
- [229/237], reporte de Fable pegado por Bernard: "Pusheado en main como 4ca40ec. Las tres variantes están en i+d/friedeberg/out/"; "los motivos viven en web/src/game/ornamentMotifs.ts, puros, en espacio de pantalla, con level. La escena sigue en metros en buildScene; buildColonnade es la unidad reutilizable y drawColonnade la dibuja"; LOD por tamaño proyectado (`visible(px, min)`), tres escalas ornamentales, `anomalyRate` seedeado con test (0 → ninguna, 1 → una de cada), galerías con profundidad, Sierpinski en el sol. Pendientes que Fable dejó: "las ventanitas de los muros de la galería se leen como píldoras azules" y "el sofito con casetones se confunde con un segundo friso".
- [233/237], ChatGPT relatando la auditoría de Fable: "ya existe otro refactor en `web/src/graphics/`, todavía sin commit al momento del informe"; la investigación "ya incorpora proporciones de Vignola, gramáticas CGA, construcción de claustros, geometría de cubiertas y técnicas de proyección"; "Fable no encontró evidencia suficiente para afirmar que Friedeberg utilizaba específicamente la axonometría o la isometría como método de trabajo".

---

## 3. Decisiones abiertas / preguntas sin cerrar

1. **¿`2d.cli` es overlay HTML sobre el canvas de Three.js o pantalla integrada en el mundo 3D?** Preguntado por ChatGPT [220/237]; Bernard nunca contestó en el chat.
2. **¿La IA diseña situaciones simbólicas a partir del diálogo (director narrativo adaptativo) o selecciona de una biblioteca curada de experiencias documentadas (intervención experiencial)?** Preguntado en [222/237]; sin respuesta. ChatGPT señala que la diferencia "es enorme".
3. **Tensión no resuelta entre el encuadre de ChatGPT y el de Bernard sobre la IA psiconauta.** ChatGPT insiste en "acompañar sin dirigir" y en no "sacar el máximo provecho psicológico" [195], [222], [235]; Bernard la quiere para "sacarle provecho al estado psiconáutico" [194] y "enseñar a usar bien la sustancia como herramienta" [221]. ChatGPT en [235]: "tener mejor información sobre una experiencia no equivale a tener autoridad para dirigir su significado". No se cerró.
4. **Cómo presentar el proyecto públicamente** (ver sección 4): ChatGPT propone encuadre de "acompañamiento y reducción de daño" [193]; Bernard solo fijó "se va a anunciar como una inteligencia artificial, pero que solamente usa lenguaje" [217].
5. **Validación del beneficio.** ChatGPT [195]: "Lo que todavía no sabemos —y habría que investigar y validar— es si ese tipo de interacción aporta beneficios psicológicos reales, para quiénes y en qué circunstancias." Nadie definió cómo.
6. **Mini biblia del proyecto** (nombre provisional, premisa, loop, funciones de la IA, reglas de seguridad, estilo visual, pitch corto) ofrecida en [193/237]; nunca se hizo.
7. **¿Cuál obra de Friedeberg le provocó "quiero entrar ahí y caminar por dentro"?** Preguntado en [216/237]; sin respuesta.
8. **Pregunta filosófica de [212/237]** (¿la silla adquirió un significado que no existía, o Pedro creó algo que ni él comprendió?); Bernard respondió con "neobarrocokitch" [213], no la cerró.
9. **Refactor paralelo en `web/src/graphics/` sin commit** [233/237]: hay que coordinarlo antes de tocar módulos compartidos; no se resolvió en el chat.
10. **¿Una sola matriz de proyección sirve para SVG y Three.js?** Fable lo propuso; ChatGPT exige que las pruebas lo demuestren [233/237].
11. **Qué minijuegos prototipar primero.** ChatGPT sugiere elegir tres por encaje técnico/diversión/costo [237/237]; Bernard no eligió.
12. **Dos ajustes visuales pendientes del templete** (ventanitas-píldora, sofito/friso), declarados por Fable en [229/237].

---

## 4. Betatesters, probar con gente, feedback de jugadores, presentación a otros

No hay ninguna mención a betatesters ni a sesiones de prueba con jugadores reales en todo el tramo. Lo que sí aparece:

- **Pruebas de seguridad y especialistas (ChatGPT [191/237]):** la IA psiconauta "exige pruebas de seguridad, colaboración con especialistas clínicos y protocolos claros para situaciones de riesgo. Y no podría garantizar que alguien esté seguro solamente por responderle en un chat."
- **Encuadre público / pitch (ChatGPT [193/237]):** "conviene presentarlo como una experiencia de acompañamiento y reducción de daño, no como 'un juego para drogarte más rico'… La diferencia importa mucho, ética y legalmente." Postura sugerida: "Es una experiencia interactiva diseñada para acompañar, orientar y contener a personas en estados perceptivos intensificados, priorizando seguridad emocional, simplicidad y contacto humano si hace falta." Ofrece además armar "pitch corto" dentro de la mini biblia.
- **Posicionamiento declarado por Bernard [217/237]:** "se va a anunciar como una inteligencia artificial, pero que solamente usa lenguaje y modelo para tomar decisiones."
- **Validación pendiente (ChatGPT [195/237]):** si la interacción "aporta beneficios psicológicos reales, para quiénes y en qué circunstancias… No lo daría por hecho."
- **Audiencia de los minijuegos (ChatGPT [237/237]):** "que sean genuinamente divertidos, incluso para alguien que no conozca tus ideas políticas o filosóficas."
- **Ausencia explícita de pruebas con jugadores (ChatGPT [237/237]):** la tabla de ranking lleva la nota "Clasificación conceptual estimada, no resultado de pruebas con jugadores ni medición del código."
- **Verificación visual como feedback (ChatGPT [226], [230]):** conservar versiones con la misma seed y comparar; "Capturas de Chrome para validar visualmente" y "Comparaciones antes/después para detectar regresiones" — feedback de pantalla, no de personas.
- **Derechos de autor (ChatGPT [218/237]):** "convendría distinguir entre estudiar sus principios estéticos y reproducir obras concretas protegidas por derechos de autor" — Bernard adoptó "estudiar sus principios" [219].
