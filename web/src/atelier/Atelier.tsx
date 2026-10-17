import { useMemo, useState } from "react";
import { composeIllustration } from "../graphics/application/compose.ts";
import { randomSeed } from "../minigames/kit/dailySeed.ts";
import { deviceScale } from "../minigames/kit/templeCanvas.ts";
import { positiveInt, readSearch, replaceSearch } from "../minigames/kit/urlParams.ts";
import { configFor, direct, override, reseed, withDirection, type Direction, type Recipe } from "./director.ts";
import type { Decision } from "./directorRules.ts";
import { strokeAt } from "./hitTest.ts";
import { Inspector } from "./Inspector.tsx";
import { PedroPanel } from "./PedroPanel.tsx";
import { usePedro } from "./usePedro.ts";
import { buildManifest, downloadText, strokeLog, svgOf } from "./manifest.ts";
import { RecipePanel } from "./RecipePanel.tsx";
import { flattenStrokes, stageBounds, type Stroke } from "./strokes.ts";
import { SPEEDS, useDrawing } from "./useDrawing.ts";

const WIDTH = 900;
const HEIGHT = 675;
const DEFAULT_NARRATION = "un templo de noche con siete columnas, lleno de galerías imposibles";

function initialRecipe(): Recipe {
  const q = readSearch();
  const narration = q.get("n") ?? DEFAULT_NARRATION;
  return direct(narration, positiveInt(q.get("seed")) ?? undefined);
}

export function Atelier() {
  const [narration, setNarration] = useState(() => initialRecipe().narration);
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe);
  const [picked, setPicked] = useState<Stroke | null>(null);
  const scale = deviceScale();

  const ill = useMemo(() => composeIllustration(configFor(recipe, WIDTH, HEIGHT)), [recipe]);
  const strokes = useMemo(() => flattenStrokes(ill.stages), [ill]);
  const stages = useMemo(() => stageBounds(ill.stages), [ill]);
  const drawing = useDrawing(strokes, WIDTH, HEIGHT, scale);
  const pedro = usePedro();

  const apply = (next: Recipe) => {
    setRecipe(next);
    setPicked(null);
    replaceSearch({ n: next.narration, seed: next.seed });
  };

  const draw = () => {
    const next = direct(narration);
    apply(next);
    pedro.ask(next.narration, next.seed);
  };

  const drawPedro = (direction: Direction) => {
    apply(withDirection(recipe, direction));
    pedro.dismiss();
  };

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * WIDTH;
    const y = ((e.clientY - box.top) / box.height) * HEIGHT;
    setPicked(strokeAt(strokes, [x, y], WIDTH * HEIGHT, drawing.drawn));
  };

  const exportAll = () => {
    const manifest = buildManifest(recipe, ill);
    downloadText(`atelier-${recipe.seed}.svg`, svgOf(ill), "image/svg+xml");
    downloadText(`atelier-${recipe.seed}.receta.json`, JSON.stringify(manifest, null, 2), "application/json");
    downloadText(`atelier-${recipe.seed}.trazos.txt`, strokeLog(ill), "text/plain");
  };

  const currentStage = stages.find((s) => drawing.drawn > s.from && drawing.drawn <= s.to)?.name ?? (drawing.finished ? "terminado" : "listo");

  return (
    <div className="atelier">
      <header className="minigame-header">
        <a className="minigame-home" href="/">← CRISTAL.CLI</a>
        <h1>atelier</h1>
        <div className="minigame-stats">
          <span>trazo {drawing.drawn}/{strokes.length}</span>
          <span>etapa {currentStage}</span>
        </div>
      </header>
      <main className="atelier-main">
        <section className="atelier-narration">
          <label htmlFor="narration">cuéntale al dibujante qué ver</label>
          <textarea id="narration" value={narration} onChange={(e) => setNarration(e.target.value)} rows={3} />
          <div className="atelier-controls">
            <button className="primary" onClick={draw}>dibujar</button>
            <button onClick={() => apply(reseed(recipe, recipe.seed))} title="misma receta, misma semilla, mismo dibujo">volver a dibujar</button>
            <button onClick={() => drawing.setPaused(!drawing.paused)}>{drawing.paused ? "seguir" : "detener"}</button>
            {SPEEDS.map((s) => (
              <button key={s} className={s === drawing.speed ? "active" : ""} onClick={() => drawing.setSpeed(s)}>×{s}</button>
            ))}
          </div>
        </section>
        <section className="atelier-easel">
          <canvas ref={drawing.canvasRef} width={WIDTH * scale} height={HEIGHT * scale} onClick={pick} aria-label="mesa de trabajo" />
          <input
            type="range"
            min={0}
            max={strokes.length}
            value={drawing.drawn}
            aria-label="ver cómo fue dibujada"
            onChange={(e) => {
              drawing.setPaused(true);
              drawing.seek(Number(e.target.value));
            }}
          />
          <div className="atelier-stages">
            {stages.map((s) => (
              <button key={s.name} className={drawing.drawn >= s.to ? "done" : ""} onClick={() => { drawing.setPaused(true); drawing.seek(s.to); }}>
                {s.name} <small>{s.to - s.from}</small>
              </button>
            ))}
          </div>
        </section>
        <aside className="atelier-side">
          <PedroPanel state={pedro.state} onDraw={drawPedro} onDismiss={pedro.dismiss} />
          <RecipePanel
            recipe={recipe}
            onOverride={(decision: Decision, because: string) => apply(override(recipe, decision, because))}
            onReseed={() => apply(reseed(recipe, randomSeed()))}
          />
          <section className="atelier-trace">
            <h2>inspector de trazo</h2>
            <Inspector stroke={picked} total={strokes.length} />
          </section>
          <div className="atelier-controls">
            <button onClick={exportAll} disabled={!drawing.finished}>exportar obra.svg + receta + trazos</button>
          </div>
        </aside>
      </main>
    </div>
  );
}
