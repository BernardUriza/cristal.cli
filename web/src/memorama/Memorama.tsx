import { useEffect, useRef, useState } from "react";
import { PALETTES } from "../graphics/config/palettes.ts";
import { glyphSvgDataUri } from "../graphics/renderers/svg/glyph.ts";
import { randomSeed } from "../minigames/kit/dailySeed.ts";
import { shareText, type ShareOutcome } from "../minigames/kit/share.ts";
import { TempleCanvas } from "../minigames/kit/TempleCanvas.tsx";
import { useBoardFit } from "../minigames/kit/useBoardFit.ts";
import { positiveInt, readSearch, replaceSearch, shareUrl } from "../minigames/kit/urlParams.ts";
import {
  bestKey,
  dailySeed,
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
  tap,
  totalPairs,
  updateBest,
  type BestMarks,
  type GameState,
  type PairCount,
} from "./memorama.ts";
import { loadSoundEnabled, playMatchTone, playWinTone, saveSoundEnabled } from "./memoramaSound.ts";

const MISMATCH_DELAY_MS = 1600;
const CARD_GAP = 8;
const CARD_ASPECT = 3 / 4;
const JUICE_MS = 700;
const BACK_GLYPH = glyphSvgDataUri("gate", PALETTES.noche.secondary, PALETTES.noche.accent, 77);

function readUrl(): { seed: number; pairs: PairCount } {
  const q = readSearch();
  const pairs = Number(q.get("pairs"));
  return { seed: positiveInt(q.get("seed")) ?? dailySeed(new Date()), pairs: isPairCount(pairs) ? pairs : 8 };
}

export function Memorama() {
  const [{ seed, pairs }, setSetup] = useState(readUrl);
  const [game, setGame] = useState<GameState>(() => newGame(seed, pairs));
  const [best, setBest] = useState<BestMarks>(loadBest);
  const [record, setRecord] = useState<{ isRecord: boolean; previous: number | null } | null>(null);
  const [sound, setSound] = useState(loadSoundEnabled);
  const [justMatched, setJustMatched] = useState<number[]>([]);
  const [justMissed, setJustMissed] = useState<number[]>([]);
  const [shared, setShared] = useState<"idle" | ShareOutcome>("idle");
  const resolveTimer = useRef<number | null>(null);
  const juiceTimer = useRef<number | null>(null);

  const today = dailySeed(new Date());
  const isDaily = seed === today;

  useEffect(() => replaceSearch({ seed, pairs }), [seed, pairs]);

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

  const share = async () => setShared(await shareText(shareLine(game, { daily: isDaily, url: shareUrl({ seed, pairs }) })));

  const onCard = (index: number) => {
    if (hasPendingPair(game) && !pendingIsMatch(game)) setJustMissed(game.faceUp);
    setGame((g) => tap(g, index));
  };

  const { ref: boardRef, fit } = useBoardFit(pairs * 2, CARD_GAP, CARD_ASPECT);
  const won = game.status === "won";
  const bestHere = best[bestKey(seed, pairs)];

  return (
    <div className="memorama">
      <header className="minigame-header">
        <a className="minigame-home" href="/">← CRISTAL.CLI</a>
        <h1>memorama</h1>
        <div className="minigame-stats">
          <span>pares {pairsFound(game)}/{totalPairs(game)}</span>
          <span>movimientos {game.moves}</span>
          <span className="memorama-seed">{isDaily ? "templo del día" : "templo"} {seed}</span>
          {bestHere !== undefined && <span className="memorama-best">mejor {bestHere}</span>}
        </div>
        <div className="minigame-controls">
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
      <main className="memorama-board" ref={boardRef}>
        <div
          className="memorama-grid"
          aria-label="tablero"
          style={fit ? { gridTemplateColumns: `repeat(${fit.columns}, ${fit.cardWidth}px)`, gap: CARD_GAP } : { visibility: "hidden" }}
        >
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
              onClick={() => onCard(i)}
            >
              <div className="card-inner">
                <div className="card-face card-back" style={{ backgroundImage: `url("${BACK_GLYPH}")` }} />
                {up ? <TempleCanvas artSeed={card.artSeed} className="card-face card-front" /> : <div className="card-face card-front" />}
              </div>
            </button>
          );
        })}
        </div>
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
