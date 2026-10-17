Claude, los números muestran progreso real: **1 → 22 topologías**. Pero también revelan que el generador diversifica mejor los palacios que los templos y ciudades. Y sí: la métrica de siluetas que propuse estaba mal definida para arquitectura conectada.

## (a) Siluetas: medir unidades semánticas, verificar contornos visibles

No uses componentes conectados como métrica principal. Un palacio puede ser una sola masa y contener seis edificios visualmente distintos.

Tampoco cuentes directamente los subgrafos: podrías inflar el resultado creando veinte torres idénticas.

Propongo **diversidad de siluetas semánticas visibles**:

```ts
type SilhouetteUnit = {
  id: string;
  semanticRoot: string; // edificio o criatura
  kind: "building" | "creature";
  contour: Vec2[];      // proyección visible, tras oclusión
  visibleRatio: number; // área visible / área proyectada
  areaPx: number;
};
```

Procedimiento:

1. Extrae cada edificio y criatura desde su raíz semántica, antes de unirlos.
2. Calcula su contorno proyectado **después de la oclusión**.
3. Descarta unidades con `visibleRatio < 0.35` o `areaPx < 400`.
4. Normaliza traslación y escala, pero **no elimines las proporciones**.
5. Compara formas mediante descriptores de contorno: Fourier de baja frecuencia, relación ancho/alto y concavidad.
6. Agrupa por similitud. Cuenta clústeres, no instancias.

```ts
type SilhouetteReport = {
  eligibleUnits: number;
  distinctClusters: number;
  effectiveDiversity: number;
  visibleAreaCoverage: number;
};
```

La diversidad efectiva puede calcularse con Shannon:

\[
D_{\mathrm{eff}}=\exp\left(-\sum_i p_i\ln p_i\right)
\]

Donde \(p_i\) es la proporción de unidades pertenecientes al clúster \(i\).

**Antiinflación:** además de la diversidad, exige que las unidades elegibles cubran una fracción significativa de la composición. No basta con colocar cinco figuritas diferentes en una esquina.

Yo usaría como objetivos iniciales:

- `distinctClusters >= 4`
- `effectiveDiversity >= 2.5`
- `visibleAreaCoverage >= 0.40`

Son umbrales de calibración, no criterios estéticos universales. Y reporta por separado edificios y criaturas: de otro modo, veinte animales podrían ocultar una arquitectura repetitiva.

Para una obra deliberadamente monolítica, no fuerces cinco siluetas. Registra que tiene una única unidad arquitectónica y evalúa su complejidad interna mediante subestructuras y niveles de anidación.

## (b) Cuatro producciones para romper templo y ciudad

Agrega R7–R10. La diferencia fundamental es introducir **ramificación, ciclos y centralidad**, no simplemente más nodos.

```text
R7 — TEMPLE_RADIAL

TEMPLE_CORE
→ SANCTUARY + 3..6 SHRINE + RING_GALLERY

Cada SHRINE conecta con RING_GALLERY.
RING_GALLERY rodea SANCTUARY.
Al menos dos SHRINE tienen geometrías distintas.
```

```text
R8 — TEMPLE_TERRACED

TEMPLE_CORE
→ PLATFORM_0 + PLATFORM_1 + PLATFORM_2
  + SANCTUARY + 2 STAIR

PLATFORM_0 > PLATFORM_1 > PLATFORM_2
en superficie.

STAIR conecta niveles consecutivos.
SANCTUARY está sobre PLATFORM_2.
```

```text
R9 — CITY_BLOCK

CITY_CORE
→ PLAZA + 3..5 BLOCK + STREET_RING

Los BLOCK rodean PLAZA.
Cada BLOCK contiene 1..4 BUILDING.
STREET_RING conecta los accesos.
```

```text
R10 — CITY_BRANCH

STREET
→ JUNCTION + STREET_A + STREET_B + STREET_C

degree(JUNCTION) >= 3
angle(STREET_A, STREET_B) >= 45°
angle(STREET_B, STREET_C) >= 45°

Opcional:
STREET_C conecta con una calle existente,
creando un ciclo.
```

En TS:

```ts
type UrbanNodeKind =
  | SpaceKind
  | "sanctuary" | "shrine"
  | "platform" | "plaza"
  | "block" | "building"
  | "street" | "junction";
```

**No implementes `STREET_RING` como un volumen macizo:** debe ser una estructura de circulación que conecte bloques sin fusionarlos visualmente.

Y una condición importante: los nodos `CITY_CORE` y `TEMPLE_CORE` deben ser **no terminales expandibles**, no edificios renderizables.

Para elegir producciones, introduce restricciones topológicas explícitas:

```ts
type TopologyGoal = {
  minBranchNodes?: number;
  minCycles?: number;
  minIndependentBuildings?: number;
  minElevationLevels?: number;
};
```

Ejemplos:

```ts
const cityGoal: TopologyGoal = {
  minBranchNodes: 2,
  minCycles: 1,
  minIndependentBuildings: 4
};

const templeGoal: TopologyGoal = {
  minCycles: 1,
  minElevationLevels: 3
};
```

El solver debe validar estas condiciones **sobre el grafo final**, no asumir que una producción garantiza el resultado.

## (c) Figuras: que el LLM componga el grafo, pero con una gramática restringida

Ni `{ family, seed }` solamente, ni JSON arbitrario con anatomía completa.

Usa **familia + operaciones de transformación**.

```ts
type CreatureProgram = {
  family:
    | "biped"
    | "quadruped"
    | "serpentine"
    | "radial"
    | "chimera";

  seed: number;

  operations: CreatureOp[];
};

type CreatureOp =
  | {
      op: "replace";
      socket: string;
      motif: string;
    }
  | {
      op: "graft";
      socket: string;
      family: CreatureProgram["family"];
      part: string;
    }
  | {
      op: "repeat";
      socket: string;
      count: number;
      arrangement: "radial" | "chain" | "bilateral";
    }
  | {
      op: "architecturalize";
      socket: string;
      grammar: "facade" | "tower" | "gallery";
    };
```

Ejemplo:

```json
{
  "family": "quadruped",
  "seed": 8172,
  "operations": [
    {
      "op": "replace",
      "socket": "head",
      "motif": "skull"
    },
    {
      "op": "graft",
      "socket": "tail",
      "family": "serpentine",
      "part": "tail"
    },
    {
      "op": "architecturalize",
      "socket": "torso",
      "grammar": "facade"
    }
  ]
}
```

El motor:

1. Instancia el grafo base de la familia.
2. Resuelve sockets semánticos.
3. Aplica operaciones en orden.
4. Valida profundidad, número de partes, anchors y presupuesto.
5. Ejecuta geometría y ornamento.
6. Inserta la figura en la escena 3D/2.5D compartida, con oclusión.

La ventaja es que el LLM **compone transformaciones**, no selecciona una criatura prefabricada ni inventa geometría que el renderer no sabe interpretar.

Mantén compatibilidad: el plan antiguo de seis ranuras puede traducirse a `CreatureProgram` para no romper recetas existentes.

---

## Qué mediría en el siguiente reporte

| Dimensión | Resultado actual | Siguiente objetivo |
|---|---:|---|
| Topologías globales | 22/60 distintas | Mantener diversidad; templo y ciudad con ≥3 cada uno |
| Siluetas | Máx. 2 por contorno conectado | ≥4 clústeres semánticos visibles donde aplique |
| Bandas de detalle | 35/60 | ≥48/60, sin añadir ruido artificial |
| Figuras híbridas | No integradas | ≥3 familias renderizadas con operaciones |
| Oclusión | Sin medir | 0 fallos en una batería de casos geométricos |

**Orden de trabajo:** R7–R10 primero, después `CreatureProgram`, finalmente nueva métrica de siluetas y batería de oclusión.

Y te marco una trampa: **22 topologías distintas no equivalen necesariamente a 22 composiciones distintas**. Dos grafos pueden diferir en conexiones internas y proyectar prácticamente la misma silueta.

Para la siguiente evaluación, quiero dos resultados separados: diversidad topológica y diversidad visual. Si ambas mejoran, entonces sí estamos saliendo del claustro con disfraces.
