Claude, **acepto tu objeción**. El umbral `0.40` sobre el lienzo estaba mal planteado para este caso. Y tienes razón en no cambiar una métrica solo para ponerla en verde.

## (a) Cobertura: sí a la envolvente convexa, con una condición

Usa la envolvente convexa proyectada del sitio como denominador para medir la ocupación **interna** de la arquitectura.

Pero conserva la cobertura del lienzo como métrica separada de composición.

```ts
type CoverageReport = {
  siteFill: number;       // arquitectura visible / hull del sitio
  canvasFill: number;     // arquitectura visible / lienzo
  hullEfficiency: number; // hull del sitio / lienzo
};
```

\[
\text{siteFill} =
\frac{A(\text{arquitectura visible}\cap H)}
{A(H)}
\]

Donde \(H\) es la envolvente convexa de la **huella completa del sitio**, proyectada con la cámara fijada antes de medir.

La condición antiinflación es importante:

**El sitio no puede redefinirse a partir de los objetos visibles que quieres puntuar.**

Si calculas la envolvente solo con los edificios, el motor puede eliminar espacios vacíos y mejorar artificialmente. Usa el límite del sitio declarado en el programa arquitectónico, incluidos patios y espacios abiertos.

Además:

- Calcula áreas mediante unión de máscaras rasterizadas a resolución fija; no sumes áreas de objetos superpuestos.
- No cuentes suelo ni fondo como arquitectura.
- Registra por separado ocupación de edificios y ocupación de criaturas.
- No uses `siteFill` como objetivo universal: un templo con gran patio vacío puede necesitar justamente ese vacío.

**Retiro el umbral `0.40`**. Primero mide la distribución de `siteFill` por arquetipo y compara versiones sobre las mismas narraciones y semillas.

Para las criaturas, el `0.06` sí señala un problema potencial de jerarquía visual, pero no obligaría a que todos los personajes fueran gigantes. Mediría también la proporción de área que ocupan las criaturas **respecto a la región narrativa donde deberían dominar**, no únicamente respecto al sitio completo.

## (b) Sustitución arquitectónica: contar transformaciones, no profundidad de contenedores

R5 (`COURTYARD → COURTYARD + COMPLEX`) **no debería contar automáticamente como sustitución**.

Eso es anidación espacial. Una habitación dentro de otra no es una transformación semántica.

Distingue:

```ts
type StructuralRelation =
  | "contains"    // anidación espacial: NO cuenta
  | "connects"    // topología: NO cuenta
  | "decorates"   // ornamento: NO cuenta
  | "rewrites";   // sustitución estructural: SÍ cuenta
```

Agregaría tres producciones nuevas:

```text
T5 — BUILDING_AS_ORNAMENT

FACADE_PANEL
→ MINI_BUILDING

La fachada pequeña reemplaza el panel.
Hereda sus límites, máscara y orientación.
Debe conservar elementos reconocibles:
entrada + cubierta + al menos un vano.
```

```text
T6 — ARCHITECTURE_AS_ARCHITECTURE

CAPITAL | PEDIMENT | ROOF
→ MINI_TEMPLE

El templo reemplaza una pieza estructural.
Su base coincide con el anclaje de la pieza.
Su silueta exterior modifica la del edificio padre.
```

```text
T7 — ORNAMENT_AS_SPACE

FRIEZE_CELL | WINDOW | FLOOR_TILE
→ PORTAL_SCENE

La celda deja de ser patrón plano.
Contiene una escena espacial con profundidad,
oclusión interna y al menos dos volúmenes.
```

### Métrica corregida

No cuentes el número de nodos del árbol ni cualquier llamada recursiva.

Cuenta **cadenas de reescritura semántica verificadas**:

```ts
type RewriteEvidence = {
  ruleId: string;
  sourceId: string;
  replacementId: string;
  sourceRole: string;
  replacementRole: string;
  projectedAreaPx: number;
  visibleRatio: number;
  semanticChanged: boolean;
};
```

Una cadena válida exige:

1. `semanticChanged === true`.
2. La geometría sustituta reemplaza realmente a la original; no es un overlay.
3. Cada nivel es visible y supera un tamaño mínimo proyectado.
4. La cadena contiene al menos **dos familias de transformación distintas**.
5. Los IDs forman una cadena real de procedencia, no tres transformaciones independientes.

Ejemplo que sí cuenta:

```text
FACHADA
  → CAPITEL CON FORMA DE TEMPLO       [T6]
      → FRISO CON PORTALES            [T7]
          → ESCENA ARQUITECTÓNICA     [T5]
```

Ejemplo que no cuenta:

```text
EDIFICIO
  contains PATIO
    contains EDIFICIO
      contains HABITACIÓN
```

Y reportaría dos valores:

```ts
type RewriteComplexity = {
  maxVerifiedDepth: number;
  visibleChainsDepth3: number;
};
```

`maxVerifiedDepth` demuestra que existe la capacidad. `visibleChainsDepth3` evita que una sola miniatura escondida haga pasar toda la obra.

**No exigiría profundidad ≥3 en las 80 obras.** Si la narración pide una pirámide solitaria, una composición deliberadamente sencilla puede ser correcta. Sí exigiría que los tests específicos de recursividad arquitectónica alcancen tres niveles sin figuras humanas.

### Decisión

Acepta la envolvente del sitio, elimina el `0.40` global y separa composición de ocupación interna.

Implementa T5–T7 y mide sustituciones arquitectónicas independientemente de las figuras.

Y conserva esos **57/80 en detalle multiescala** como problema abierto. Es más relevante visualmente que conseguir un número bonito de cobertura.

Una última observación: **48 topologías y 10–12 composiciones visuales** es una diferencia que todavía merece atención. El siguiente cuello de botella probablemente ya no sea la gramática espacial, sino cómo el motor convierte estructuras diferentes en siluetas, masas y jerarquías visuales realmente diferentes.
