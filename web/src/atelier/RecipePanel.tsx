import { PALETTE_NAMES } from "../graphics/config/palettes.ts";
import type { Recipe } from "./director.ts";
import type { Decision } from "./directorRules.ts";

type Props = { recipe: Recipe; onOverride: (decision: Decision, because: string) => void; onReseed: () => void };

export function RecipePanel({ recipe, onOverride, onReseed }: Props) {
  const density = recipe.choices.find((c) => c.decision.field === "density")?.decision.value as number | undefined;
  return (
    <section className="atelier-recipe">
      <h2>receta · semilla {recipe.seed}</h2>
      <ol>
        {recipe.choices.map((c) => (
          <li key={c.decision.field} className={`choice-${c.source}`}>
            <b>{c.decision.field}</b> = {String(c.decision.value)} <span>{c.because}</span>
          </li>
        ))}
      </ol>
      <div className="atelier-controls">
        {PALETTE_NAMES.map((name) => (
          <button key={name} onClick={() => onOverride({ field: "palette", value: name }, `cambiaste la paleta a ${name}`)}>paleta {name}</button>
        ))}
        <button onClick={() => onOverride({ field: "density", value: Math.min(1, (density ?? 0.6) + 0.2) }, "pediste más ornamento")}>más ornamento</button>
        <button onClick={() => onOverride({ field: "density", value: Math.max(0, (density ?? 0.6) - 0.2) }, "pediste menos ornamento")}>menos ornamento</button>
        <button onClick={() => onOverride({ field: "anomalyRate", value: 0.95 }, "pediste que algo se rompa")}>rómpelo</button>
        <button onClick={onReseed}>otra semilla</button>
      </div>
    </section>
  );
}
