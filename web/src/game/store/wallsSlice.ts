import { fnv1a } from "../../shared/rng";
import { takeEcho } from "../echoClient";
import { generateMaze } from "../maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED } from "../mazeConfig";
import {
  createDiscoveryState,
  isStarved,
  noteDiscovery,
  noteStarvationRelief,
} from "../DiscoveryClock";
import {
  compactInscription,
  deformPhrase,
  inscriptionId,
  INSCRIPTION_LIMIT,
  loadInscriptions,
  placeInscription,
  saveInscriptions,
  type WorldInscription,
} from "../inscriptions/WorldInscriptions";
import { ECHO_ACCENT, GOLDEN_RATIO_HASH, STARVATION_ACCENT, STARVATION_FALLBACK } from "./config";
import type { GameSlice, WallsSlice } from "./types";

const WORLD_MAZE = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);

export const createWallsSlice: GameSlice<WallsSlice> = (set, get) => ({
  inscriptions: loadInscriptions(),
  discovery: createDiscoveryState(Date.now()),
  foreignEcho: null,

  addInscription: (text, stance, originCell, accent, now) =>
    set((s) => {
      const slot = placeInscription(WORLD_MAZE, originCell, s.inscriptions, fnv1a(text) ^ now);
      if (!slot) return s;
      const id = inscriptionId(text, now);
      const inscription: WorldInscription = {
        id,
        text: compactInscription(text),
        cell: slot.cell,
        side: slot.side,
        stance,
        source: "console",
        accent,
        at: now,
      };
      const inscriptions = [...s.inscriptions, inscription].slice(-INSCRIPTION_LIMIT);
      saveInscriptions(inscriptions);
      return { inscriptions, discovery: noteDiscovery(s.discovery, "phrase", id, now) };
    }),

  noteDiscovery: (kind, key, now) =>
    set((s) => {
      const discovery = noteDiscovery(s.discovery, kind, key, now);
      return discovery === s.discovery ? s : { discovery };
    }),

  relieveStarvation: (playerCell, now) =>
    set((s) => {
      if (!isStarved(s.discovery, now)) return s;
      const ownWords = s.inscriptions.filter((item) => item.source === "console").map((item) => item.text);
      if (s.verticalSlice.confessionFragment) ownWords.push(s.verticalSlice.confessionFragment);
      const pool = ownWords.length > 0 ? ownWords : STARVATION_FALLBACK;
      const seed = (now ^ Math.imul(s.discovery.starvations + 1, GOLDEN_RATIO_HASH)) >>> 0;
      const foreign = s.foreignEcho;
      const phrase = foreign ?? pool[seed % pool.length];
      const slot =
        placeInscription(WORLD_MAZE, playerCell, s.inscriptions, seed, { minRing: 1, maxRing: 2 }) ??
        placeInscription(WORLD_MAZE, playerCell, s.inscriptions, seed);
      const discovery = noteStarvationRelief(s.discovery, now);
      if (!slot) return { discovery };
      const inscription: WorldInscription = {
        id: inscriptionId(phrase, now),
        text: deformPhrase(phrase, seed),
        cell: slot.cell,
        side: slot.side,
        stance: null,
        source: foreign ? "echo" : "starvation",
        accent: foreign ? ECHO_ACCENT : STARVATION_ACCENT,
        at: now,
      };
      const inscriptions = [...s.inscriptions, inscription].slice(-INSCRIPTION_LIMIT);
      saveInscriptions(inscriptions);
      return { inscriptions, discovery, foreignEcho: foreign ? null : s.foreignEcho };
    }),

  setForeignEcho: (text) => set({ foreignEcho: text }),

  fetchForeignEcho: () => {
    void takeEcho(get().verticalSlice.confessionFragment ?? "").then((text) => {
      if (text) set({ foreignEcho: text });
    });
  },
});
