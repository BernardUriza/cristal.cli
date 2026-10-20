import { useMemo, useState } from "react";
import { randomSeed } from "../minigames/kit/dailySeed.ts";
import { deviceScale } from "../shared/display.ts";
import { positiveIntParam, replaceSearch, stringParam } from "../shared/url.ts";
import { direct, override, planOf, reseed, withDirection, type Direction, type Recipe } from "./director.ts";
import type { Decision } from "./directorRules.ts";
import { strokeAt } from "./hitTest.ts";
import { Inspector } from "./Inspector.tsx";
import { buildManifest, downloadText, strokeLog, svgOf } from "./manifest.ts";
import { PedroPanel } from "./PedroPanel.tsx";
import { RecipePanel } from "./RecipePanel.tsx";
import { flattenStrokes, stageBounds, type Stroke } from "./strokes.ts";
import { SPEEDS, useDrawing } from "./useDrawing.ts";
import { usePedro } from "./usePedro.ts";
import type { MotifName } from "./vocabulary.ts";
import { loadWall, pinSketch, saveWall, sketchId, thumbnailOf, type Sketch } from "./wall.ts";
import { Wall } from "./Wall.tsx";
import { wallMotifs } from "./wallMotifs.ts";
import { composeWork } from "./work.ts";

const WIDTH = 1200;
const HEIGHT = 900;
const DEFAULT_NARRATION = "un patio de noche que se recorre como un mapa, con un ojo que vigila desde la torre y una escalera que sube al cielo";

function initialRecipe(): Recipe {
  const narration = stringParam("n") ?? DEFAULT_NARRATION;
  return direct(narration, positiveIntParam("seed") ?? undefined);
}

export function Atelier() {
  const [narration, setNarration] = useState(() => initialRecipe().narration);
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe);
  const [picked, setPicked] = useState<Stroke | null>(null);
  const [sketches, setSketches] = useState<Sketch[]>(loadWall);
  const scale = deviceScale();

  const work = useMemo(() => composeWork(recipe, WIDTH, HEIGHT), [recipe]);
  const strokes = useMemo(() => flattenStrokes(work.stages), [work]);
  const stages = useMemo(() => stageBounds(work.stages), [work]);
  const motifs = useMemo(wallMotifs, []);
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

  const toggleMotif = (id: MotifName) => {
    const current = planOf(recipe).motifs;
    const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id].slice(-3);
    apply(override(recipe, { field: "motifs", value: next }, current.includes(id) ? `quitaste ${id} de la pared` : `pediste ${id} de la pared`));
  };

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * WIDTH;
    const y = ((e.clientY - box.top) / box.height) * HEIGHT;
    setPicked(strokeAt(strokes, [x, y], WIDTH * HEIGHT, drawing.drawn));
  };

  const hang = () => {
    const canvas = drawing.canvasRef.current;
    if (!canvas) return;
    const sketch: Sketch = { id: sketchId(recipe), title: recipe.title, seed: recipe.seed, narration: recipe.narration, recipe, thumbnail: thumbnailOf(canvas), at: Date.now() };
    const next = pinSketch(sketches, sketch);
    setSketches(next);
    saveWall(next);
  };

  const exportAll = () => {
    downloadText(`atelier-${recipe.seed}.svg`, svgOf(work), "image/svg+xml");
    downloadText(`atelier-${recipe.seed}.receta.json`, JSON.stringify(buildManifest(recipe, work), null, 2), "application/json");
    downloadText(`atelier-${recipe.seed}.trazos.txt`, strokeLog(work), "text/plain");
  };

  const currentStage = stages.find((s) => drawing.drawn > s.from && drawing.drawn <= s.to)?.name ?? (drawing.finished ? "terminado" : "listo");

  return (
    <div className="atelier">
      <header className="minigame-header">
        <a className="minigame-home" href="/">← CRISTAL.CLI</a>
        <h1>atelier</h1>
        <div className="minigame-stats">
          <span>{work.plan.composition}</span>
          <span>trazo {drawing.drawn}/{strokes.length}</span>
          <span>etapa {currentStage}</span>
        </div>
      </header>
      <main className="atelier-main">
        <Wall motifs={motifs} active={work.plan.motifs} onToggle={toggleMotif} sketches={sketches} onOpen={(s) => { setNarration(s.narration); apply(s.recipe); }} />
        <section className="atelier-table" aria-label="mesa de trabajo">
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
          <canvas ref={drawing.canvasRef} width={WIDTH * scale} height={HEIGHT * scale} onClick={pick} aria-label="lienzo" />
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
        <aside className="atelier-side" aria-label="el director">
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
            <button onClick={hang} disabled={!drawing.finished}>colgar en la pared</button>
            <button onClick={exportAll} disabled={!drawing.finished}>exportar obra.svg + receta + trazos</button>
          </div>
        </aside>
      </main>
    </div>
  );
}
