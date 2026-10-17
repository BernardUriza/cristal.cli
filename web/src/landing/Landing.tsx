import { PALETTES } from "../graphics/config/palettes.ts";
import { glyphSvgDataUri } from "../graphics/renderers/svg/glyph.ts";
import { TempleCanvas } from "../minigames/kit/TempleCanvas.tsx";

const LABYRINTH_GLYPH = glyphSvgDataUri("gate", PALETTES.noche.secondary, PALETTES.noche.accent, 77);
const PREVIEW_SEEDS = [4242, 90210, 31337];

function TemplePreview() {
  return (
    <div className="landing-preview temples" aria-hidden>
      {PREVIEW_SEEDS.map((seed) => (
        <TempleCanvas key={seed} artSeed={seed} className="landing-temple" />
      ))}
    </div>
  );
}

export function Landing() {
  return (
    <main className="landing">
      <header className="landing-header">
        <img src="/brand/emblem.png" alt="" className="landing-emblem" />
        <h1 className="landing-title">CRISTAL.CLI</h1>
        <p className="landing-tagline">write what you feel</p>
      </header>
      <nav className="landing-choices" aria-label="juegos">
        <a className="choice" href="/laberinto.html">
          <div className="landing-preview glyph" style={{ backgroundImage: `url("${LABYRINTH_GLYPH}")` }} aria-hidden />
          <h2>laberinto</h2>
          <p>Un laberinto 3D con consolas dentro. Escribes lo que sientes y el mundo responde.</p>
          <p className="choice-meta">escritorio · teclado · WASD + E</p>
        </a>
        <a className="choice" href="/memorama.html">
          <TemplePreview />
          <h2>memorama</h2>
          <p>Encuentra las parejas de templos. Cada carta se dibuja por semilla: ninguna partida repite su arte.</p>
          <p className="choice-meta">celular o escritorio · un dedo</p>
        </a>
        <a className="choice" href="/atelier.html">
          <TempleCanvas artSeed={48291} className="landing-preview atelier" />
          <h2>atelier</h2>
          <p>Cuéntale al dibujante qué ver y míralo dibujar trazo por trazo con matemáticas. Cada trazo dice de dónde salió.</p>
          <p className="choice-meta">celular o escritorio · sin IA generativa</p>
        </a>
      </nav>
      <footer className="landing-footer">
        <a href="https://github.com/BernardUriza/cristal.cli">código</a>
        <a href="https://bernarduriza.com">bernarduriza.com</a>
      </footer>
    </main>
  );
}
