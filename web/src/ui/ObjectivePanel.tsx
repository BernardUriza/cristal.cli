import { authoredBeats, objectiveForSlice, runSummary } from "../game/VerticalSlice";
import { riteSummaryLine } from "../game/riteFocus";
import { useGame } from "../game/store";
import { GameMode } from "../game/types";

function RunClosure() {
  const slice = useGame((s) => s.verticalSlice);
  const startNextVariation = useGame((s) => s.startNextVariation);
  const summary = runSummary(slice);

  return (
    <section className="objective-panel run-closure" aria-label="rito cerrado">
      <div className="objective-kicker">RITO CERRADO · RUN {summary.completedRuns}</div>
      <div className="objective-text">{objectiveForSlice(slice)}</div>
      <ul className="run-summary">
        <li>frase {summary.phrase ? `«${summary.phrase}»` : "— ninguna archivada"}</li>
        <li>glifo {summary.glyph ?? "— ninguno"}</li>
        <li>
          cuartos {summary.crossedRooms} · puertas falsas {summary.falseDoors}
        </li>
        <li>runs cerrados {summary.completedRuns}</li>
      </ul>
      <button type="button" className="run-restart" onClick={startNextVariation}>
        [ abrir otra variación ]
      </button>
      <div className="run-closure-note">la memoria del terminal se conserva</div>
    </section>
  );
}

export function ObjectivePanel() {
  const slice = useGame((s) => s.verticalSlice);
  const pressure = useGame((s) => s.psychologicalPressure);
  const inRoom = useGame((s) => s.mode === GameMode.Room);

  if (inRoom) {
    return (
      <section className="objective-panel objective-panel-compact" aria-label="objetivo actual">
        <div className="objective-kicker">{riteSummaryLine(slice)}</div>
        <div className="objective-text">{objectiveForSlice(slice)}</div>
      </section>
    );
  }

  if (slice.step === "complete") {
    return <RunClosure />;
  }

  return (
    <section className="objective-panel" aria-label="objetivo actual">
      <div className="objective-kicker">RITO GUIADO</div>
      <div className="objective-text">{objectiveForSlice(slice)}</div>
      <ol className="objective-beats">
        {authoredBeats(slice).map((beat) => (
          <li key={beat.id} className={beat.done ? "beat done" : "beat"}>
            <span aria-hidden>{beat.done ? "●" : "○"}</span> {beat.label}
          </li>
        ))}
      </ol>
      <div className="objective-meta">
        <span>cuartos {slice.crossedRooms}</span>
        <span>presion {Math.round(pressure * 100)}%</span>
      </div>
    </section>
  );
}

export function ConsequenceSignal() {
  const signal = useGame((s) => s.verticalSlice.lastSignal);
  if (!signal) return null;
  return (
    <div key={signal} className="consequence-signal" role="status" aria-live="polite">
      {signal}
    </div>
  );
}
