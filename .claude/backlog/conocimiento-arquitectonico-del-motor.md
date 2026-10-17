# Conocimiento arquitectónico real en el motor

Status: In progress (experimento del edificio con patio Done en `2c1f2df`; faltan órdenes clásicos y ornamento por cara)
Proposed: 2026-10-16 by Bernard (chat ChatGPT "friedeberg astra"; destilado por Claude)

**Qué es.** Regla dura 7. Secuencia obligatoria programa espacial → planta → volumetría → proyección →
lenguaje arquitectónico → ornamento → render ("el ornamento llega al final") [232]; seis conocimientos
(planimetría, geometría descriptiva, tratados y proporción, lógica estructural, urbanismo, ornamento
histórico) [232]; RAG de tratados sólo para principios, la geometría la calculan algoritmos
deterministas [232]; anomalía = transformación explícita del modelo, no error de proyección [232], [233].
Primer experimento: edificio con patio, galería de arcos, cuatro torres y cubierta → planta, alzado,
sección, axonometría y vista Three.js del MISMO modelo; éxito = mover una puerta la mueve en todas las
vistas [232], [233].

**Ya aterrizado (`2c1f2df`, 2026-10-15; reportado 2026-10-17).** Edificio computacional v0, sin ornamento:

- Programa y layout del claustro en `web/src/graphics/config/programs.ts` (patio, cuatro galerías, cuatro
  torres, vestíbulo, ocho salas; adyacencias `door | arch | open`).
- Planta derivada de aristas compartidas (`domain/architecture/plan.ts`); `openingOverrides[pairKey(a,b)].at`
  mueve una puerta.
- Validación en tres planos (`domain/architecture/validate.ts`): geométrica, arquitectónica (BFS desde el
  exterior, patio cerrado, torres en esquinas) y estructural marcada `not-evaluated` — nada certifica
  edificabilidad, como pidió la precaución de [233].
- Volumetría a sólidos convexos (`mass.ts`), proyectores con matrices propias (`application/projector.ts`:
  planta, alzados, isométrica, dimétrica, caballera, gabinete, militar, cónica) y `renderers/three/building/camera.ts`
  copia la matriz a Three; `camera.test.ts` exige igualdad en NDC con `Vector3.project` (la igualdad se prueba, no se asume).
- Láminas plan/alzado/sección/axonometría sobre el mismo `DisplayList` que `toSvg`; corte real por plano
  (`domain/math/clip.ts`). Límite conocido: painter's por sólido, no eliminación exacta de líneas ocultas.
- `node i+d/friedeberg/render-building.ts --door=0.2` → `out/building/*.svg` + `building.json` + `validation.json`.
- Página navegable `web/building.html` (slider de puerta, cámaras desde el mismo `Projector`).
  Prod: `https://cristal.bernarduriza.com/building.html` responde 200 (2026-10-17). Capturas:
  `i+d/friedeberg/capturas/building-{plan,elevation,section,axonometric}.png`, `building-page-door0.2.jpg`.

El test de la puerta pasa: `drawings.test.ts` y `plan.test.ts` dentro de los 75 verdes de 2026-10-17.

**Canónico a reusar.** `web/src/graphics/domain/architecture/` y la auditoría
`i+d/friedeberg/auditoria-gramatica-arquitectonica.md` (Vignola, gramáticas CGA, claustros y cubiertas) [233].

**Decisión de Bernard.** Ninguna; es ejecución.

**Next.** Órdenes clásicos (`config/orders.ts` con las cifras de Vignola citadas en la auditoría), arcos de
dos centros en la arcada, ornamento por cara con uv, anomalías con traza.
