import type { Sketch } from "./wall.ts";
import type { MotifName } from "./vocabulary.ts";

export type WallMotif = { id: MotifName; name: string; tags: string[]; svg: string };

type Props = {
  motifs: WallMotif[];
  active: MotifName[];
  onToggle: (id: MotifName) => void;
  sketches: Sketch[];
  onOpen: (sketch: Sketch) => void;
};

export function Wall({ motifs, active, onToggle, sketches, onOpen }: Props) {
  return (
    <section className="atelier-wall" aria-label="pared de inspiración">
      <h2>la pared</h2>
      <p className="atelier-hint">figuras propias, trazadas con Bézier; toca una para pedirla en la obra</p>
      <div className="atelier-wall-grid">
        {motifs.map((m) => (
          <button key={m.id} className={`atelier-motif${active.includes(m.id) ? " active" : ""}`} onClick={() => onToggle(m.id)} aria-pressed={active.includes(m.id)} title={m.tags.join(" · ")}>
            <span className="atelier-motif-art" dangerouslySetInnerHTML={{ __html: m.svg }} />
            <span className="atelier-motif-name">{m.name}</span>
          </button>
        ))}
      </div>
      {sketches.length > 0 && (
        <>
          <h2>bocetos colgados</h2>
          <div className="atelier-wall-grid sketches">
            {sketches.map((s) => (
              <button key={s.id} className="atelier-sketch" onClick={() => onOpen(s)} title={s.narration}>
                <img src={s.thumbnail} alt="" />
                <span className="atelier-motif-name">{s.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
