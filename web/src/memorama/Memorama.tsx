import { useEffect, useMemo, useRef, useState } from "react";
import { composeIllustration } from "../graphics/application/compose.ts";
import { PALETTES } from "../graphics/config/palettes.ts";
import { rasterize } from "../graphics/renderers/canvas/rasterize.ts";
import { glyphSvgDataUri } from "../graphics/renderers/svg/glyph.ts";
import { cardArtInput } from "./cardArt.ts";
import {
  bestKey,
  dailySeed,
  flip,
  hasPendingPair,
  isFaceUp,
  isPairCount,
  loadBest,
  newGame,
  PAIR_OPTIONS,
  pairsFound,
  pendingIsMatch,
  resolve,
  saveBest,
  shareLine,
  totalPairs,
  updateBest,
  type BestMarks,
  type GameState,
  type PairCount,
} from "./memorama.ts";
import { loadSoundEnabled, playMatchTone, playWinTone, saveSoundEnabled } from "./memoramaSound.ts";

const MISMATCH_DELAY_MS = 900;
const JUICE_MS = 700;
const BACK_GLYPH = glyphSvgDataUri("gate", PALETTES.noche.secondary, PALETTES.noche.accent, 77);

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

function readUrl(): { seed: number; pairs: PairCount } {
  const q = new URLSearchParams(window.location.search);
  const seed = Number(q.get("seed"));
  const pairs = Number(q.get("pairs"));
  return {
    seed: Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : dailySeed(new Date()),
    pairs: isPairCount(pairs) ? pairs : 8,
  };
}

function writeUrl(seed: number, pairs: PairCount) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  url.searchParams.set("pairs", String(pairs));
  window.history.replaceState(null, "", url);
}

function shareUrl(seed: number, pairs: PairCount): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("seed", String(seed));
  url.searchParams.set("pairs", String(pairs));
  return url.toString();
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
  const [best, setBest] = useState<BestMarks>(loadBest);
  const [record, setRecord] = useState<{ isRecord: boolean; previous: number | null } | null>(null);
  const [sound, setSound] = useState(loadSoundEnabled);
  const [justMatched, setJustMatched] = useState<number[]>([]);
  const [justMissed, setJustMissed] = useState<number[]>([]);
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");
  const resolveTimer = useRef<number | null>(null);
  const juiceTimer = useRef<number | null>(null);

  const today = dailySeed(new Date());
  const isDaily = seed === today;

  useEffect(() => writeUrl(seed, pairs), [seed, pairs]);

  useEffect(() => {
    if (!hasPendingPair(game)) return;
    const [a, b] = game.faceUp;
    if (pendingIsMatch(game)) {
      setJustMatched([a, b]);
      if (sound) playMatchTone();
      setGame((g) => resolve(g));
    } else {
      resolveTimer.current = window.setTimeout(() => {
        setJustMissed([a, b]);
        setGame((g) => resolve(g));
      }, MISMATCH_DELAY_MS);
    }
    return () => {
      if (resolveTimer.current !== null) window.clearTimeout(resolveTimer.current);
    };
  }, [game, sound]);

  useEffect(() => {
    if (justMatched.length === 0 && justMissed.length === 0) return;
    juiceTimer.current = window.setTimeout(() => {
      setJustMatched([]);
      setJustMissed([]);
    }, JUICE_MS);
    return () => {
      if (juiceTimer.current !== null) window.clearTimeout(juiceTimer.current);
    };
  }, [justMatched, justMissed]);

  useEffect(() => {
    if (game.status !== "won") return;
    const next = updateBest(best, seed, pairs, game.moves);
    setBest(next.best);
    saveBest(next.best);
    setRecord({ isRecord: next.isRecord, previous: next.previous });
    if (sound) playWinTone();
  }, [game.status]);

  const start = (nextSeed: number, nextPairs: PairCount) => {
    setSetup({ seed: nextSeed, pairs: nextPairs });
    setGame(newGame(nextSeed, nextPairs));
    setRecord(null);
    setShared("idle");
  };

  const toggleSound = () => {
    setSound((s) => {
      saveSoundEnabled(!s);
      return !s;
    });
  };

  const share = async () => {
    const text = shareLine(game, { daily: isDaily, url: shareUrl(seed, pairs) });
    const touch = window.matchMedia("(pointer: coarse)").matches;
    try {
      if (touch && navigator.share && (!navigator.canShare || navigator.canShare({ text }))) {
        await navigator.share({ text });
        setShared("copied");
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared("copied");
    } catch {
      setShared("failed");
    }
  };

  const columns = useMemo(() => (pairs === 12 ? 6 : 4), [pairs]);
  const rows = Math.ceil((pairs * 2) / columns);
  const won = game.status === "won";
  const bestHere = best[bestKey(seed, pairs)];

  return (
    <div className="memorama" style={{ ["--cols" as string]: columns, ["--rows" as string]: rows }}>
      <header className="memorama-header">
        <a className="memorama-home" href="/">← CRISTAL.CLI</a>
        <h1>memorama</h1>
        <div className="memorama-stats">
          <span>pares {pairsFound(game)}/{totalPairs(game)}</span>
          <span>movimientos {game.moves}</span>
          <span className="memorama-seed">{isDaily ? "templo del día" : "templo"} {seed}</span>
          {bestHere !== undefined && <span className="memorama-best">mejor {bestHere}</span>}
        </div>
        <div className="memorama-controls">
          {PAIR_OPTIONS.map((n) => (
            <button key={n} className={n === pairs ? "active" : ""} onClick={() => start(isDaily ? today : randomSeed(), n)}>
              {n} pares
            </button>
          ))}
          <button className={isDaily ? "active" : ""} onClick={() => start(today, pairs)}>hoy</button>
          <button onClick={() => start(seed, pairs)}>repetir</button>
          <button onClick={() => start(randomSeed(), pairs)}>nueva</button>
          <button onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "silenciar" : "activar sonido"}>
            {sound ? "♪ on" : "♪ off"}
          </button>
        </div>
      </header>
      <main className="memorama-grid" aria-label="tablero">
        {game.cards.map((card, i) => {
          const up = isFaceUp(game, i);
          const matched = game.matched.includes(i);
          const pulse = justMatched.includes(i);
          const miss = justMissed.includes(i);
          return (
            <button
              key={card.id}
              className={`card${up ? " up" : ""}${matched ? " matched" : ""}${pulse ? " pulse" : ""}${miss ? " miss" : ""}`}
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
          <p>
            {isDaily ? "templo del día" : "templo"} {seed} completo en {game.moves} movimientos
          </p>
          <p className="memorama-record">
            {record?.isRecord && record.previous !== null && `nueva mejor marca (antes ${record.previous})`}
            {record?.isRecord && record.previous === null && "primera marca en este templo"}
            {record && !record.isRecord && record.previous !== null && `mejor marca ${record.previous}`}
          </p>
          <p className="memorama-glyphs" aria-label="resultado">{shareLine(game, { daily: isDaily }).split("\n")[1]}</p>
          <div className="memorama-won-actions">
            <button autoFocus onClick={share}>
              {shared === "copied" ? "copiado" : shared === "failed" ? "no se pudo copiar" : "compartir resultado"}
            </button>
            <button onClick={() => start(seed, pairs)}>repetir</button>
            <button onClick={() => start(randomSeed(), pairs)}>otra partida</button>
          </div>
        </div>
      )}
    </div>
  );
}
