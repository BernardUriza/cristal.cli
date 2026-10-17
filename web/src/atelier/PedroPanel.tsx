import type { Direction } from "./director.ts";
import type { PedroState } from "./usePedro.ts";

type Props = { state: PedroState; onDraw: (direction: Direction) => void; onDismiss: () => void };

export function PedroPanel({ state, onDraw, onDismiss }: Props) {
  if (state.status === "idle") return null;
  if (state.status === "thinking") return <p className="atelier-pedro thinking">Pedro está leyendo tu narración… mientras, el motor ya dibuja la lectura local.</p>;
  if (state.status === "silent") return <p className="atelier-pedro silent">Pedro no contestó esta vez; la lectura local se queda.</p>;
  return (
    <section className="atelier-pedro" aria-live="polite">
      <h2>Pedro propone «{state.direction.title}»</h2>
      <ol>
        {state.direction.choices.map((c) => (
          <li key={c.decision.field}>
            <b>{c.decision.field}</b> = {Array.isArray(c.decision.value) ? c.decision.value.join(", ") || "ninguno" : String(c.decision.value)} <span>{c.because}</span>
          </li>
        ))}
      </ol>
      <div className="atelier-controls">
        <button className="primary" onClick={() => onDraw(state.direction)}>dibujar la lectura de Pedro</button>
        <button onClick={onDismiss}>quedarme con la mía</button>
      </div>
    </section>
  );
}
