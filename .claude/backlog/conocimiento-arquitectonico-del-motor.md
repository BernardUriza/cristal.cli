# Conocimiento arquitectónico real en el motor

Status: Proposed
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Regla dura 7. Secuencia obligatoria programa espacial → planta → volumetría → proyección →
lenguaje arquitectónico → ornamento → render ("el ornamento llega al final") [232]; seis conocimientos
(planimetría, geometría descriptiva, tratados y proporción, lógica estructural, urbanismo, ornamento
histórico) [232]; RAG de tratados sólo para principios, la geometría la calculan algoritmos
deterministas [232]; anomalía = transformación explícita del modelo, no error de proyección [232], [233].
Primer experimento: edificio con patio, galería de arcos, cuatro torres y cubierta → planta, alzado,
sección, axonometría y vista Three.js del MISMO modelo; éxito = mover una puerta la mueve en todas las
vistas [232], [233].

**Canónico a reusar.** `web/src/graphics/domain/architecture/validate.ts` y la investigación que ya
incorpora Vignola, gramáticas CGA, claustros y cubiertas [233].

**Decisión de Bernard.** Ninguna; es ejecución. Precauciones de ChatGPT: coherencia ≠ edificabilidad;
la igualdad de la matriz de proyección SVG/Three.js se prueba, no se asume [233].

**Next.** El experimento del edificio con patio, con sus cinco vistas y el test de la puerta.
