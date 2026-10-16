import { useEffect, useMemo, useRef, useState } from "react";
import { composeIllustration } from "../graphics/application/compose.ts";
import { PALETTES } from "../graphics/config/palettes.ts";
import { rasterize } from "../graphics/renderers/canvas/rasterize.ts";
import { glyphSvgDataUri } from "../graphics/renderers/svg/glyph.ts";
import { cardArtInput } from "./cardArt.ts";
import { flip, hasPendingPair, isFaceUp, isPairCount, newGame, PAIR_OPTIONS, pairsFound, resolve, totalPairs, type GameState, type PairCount } from "./memorama.ts";

const MISMATCH_DELAY_MS = 900;
const BACK_GLYPH = glyphSvgDataUri("gate", PALETTES.noche.secondary, PALETTES.noche.accent, 77);

function readUrl(): { seed: number; pairs: PairCount } {
  const q = new URLSearchParams(window.location.search);
  const seed = Number(q.get("seed"));
  const pairs = Number(q.get("pairs"));
  return {
    seed: Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Math.floor(Math.random() * 1_000_000) + 1,
    pairs: isPairCount(pairs) ? pairs : 8,
  };
}

function writeUrl(seed: number, pairs: PairCount) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  url.searchParams.set("pairs", String(pairs));
  window.history.replaceState(null, "", url);
}

function CardFace({ artSeed }: { artSeed: number }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const ill = composeIllustration(cardArtInput(artSeed));
    const canvas = rasterize(ill.layers, ill.width, ill.height, Math.min(2, window.devicePixelRatio || 1));
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    el.replaceChildren(canvas);
  }, [artSeed]);
  return <div ref={holder} className="card-face card-front" />;
}

export function Memorama() {
  const [{ seed, pairs }, setSetup] = useState(readUrl);
  const [game, setGame] = useState<GameState>(() => newGame(seed, pairs));
  const resolveTimer = useRef<number | null>(null);

  useEffect(() => writeUrl(seed, pairs), [seed, pairs]);

  useEffect(() => {
    if (!hasPendingPair(game)) return;
    const [a, b] = game.faceUp;
    const isMatch = game.cards[a].pairId === game.cards[b].pairId;
    if (isMatch) {
      setGame((g) => resolve(g));
      return;
    }
    resolveTimer.current = window.setTimeout(() => setGame((g) => resolve(g)), MISMATCH_DELAY_MS);
    return () => {
      if (resolveTimer.current !== null) window.clearTimeout(resolveTimer.current);
    };
  }, [game]);

  const start = (nextSeed: number, nextPairs: PairCount) => {
    setSetup({ seed: nextSeed, pairs: nextPairs });
    setGame(newGame(nextSeed, nextPairs));
  };

  const columns = useMemo(() => (pairs === 12 ? 6 : 4), [pairs]);
  const rows = Math.ceil((pairs * 2) / columns);
  const won = game.status === "won";

  return (
    <div className="memorama" style={{ ["--cols" as string]: columns, ["--rows" as string]: rows }}>
      <header className="memorama-header">
        <a className="memorama-home" href="/">← CRISTAL.CLI</a>
        <h1>memorama</h1>
        <div className="memorama-stats">
          <span>pares {pairsFound(game)}/{totalPairs(game)}</span>
          <span>movimientos {game.moves}</span>
          <span className="memorama-seed">semilla {seed}</span>
        </div>
        <div className="memorama-controls">
          {PAIR_OPTIONS.map((n) => (
            <button key={n} className={n === pairs ? "active" : ""} onClick={() => start(Math.floor(Math.random() * 1_000_000) + 1, n)}>
              {n} pares
            </button>
          ))}
          <button onClick={() => start(seed, pairs)}>repetir</button>
          <button onClick={() => start(Math.floor(Math.random() * 1_000_000) + 1, pairs)}>nueva</button>
        </div>
      </header>
      <main className="memorama-grid" aria-label="tablero">
        {game.cards.map((card, i) => {
          const up = isFaceUp(game, i);
          const matched = game.matched.includes(i);
          return (
            <button
              key={card.id}
              className={`card${up ? " up" : ""}${matched ? " matched" : ""}`}
              aria-label={up ? `carta ${i + 1} descubierta` : `carta ${i + 1}`}
              aria-pressed={up}
              disabled={won}
              onClick={() => setGame((g) => flip(g, i))}
            >
              <div className="card-inner">
                <div className="card-face card-back" style={{ backgroundImage: `url("${BACK_GLYPH}")` }} />
                {up ? <CardFace artSeed={card.artSeed} /> : <div className="card-face card-front" />}
              </div>
            </button>
          );
        })}
      </main>
      {won && (
        <div className="memorama-won" role="status">
          <p>templo completo en {game.moves} movimientos</p>
          <button autoFocus onClick={() => start(Math.floor(Math.random() * 1_000_000) + 1, pairs)}>otra partida</button>
        </div>
      )}
    </div>
  );
}
