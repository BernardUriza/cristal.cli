export interface InscriptionSignals {
  keywords: string[];
  mood: "dread" | "sorrow" | "wonder" | "neutral";
  threatLevel: number;
  symbols: string[];
}

type Mood = InscriptionSignals["mood"];

const KEYWORD_LIMIT = 8;

const STOPWORDS = new Set([
  "a",
  "al",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "con",
  "de",
  "del",
  "el",
  "en",
  "es",
  "esta",
  "este",
  "for",
  "from",
  "in",
  "is",
  "it",
  "la",
  "las",
  "lo",
  "los",
  "mi",
  "no",
  "of",
  "on",
  "or",
  "por",
  "que",
  "se",
  "su",
  "sus",
  "the",
  "to",
  "tu",
  "un",
  "una",
  "y",
]);

const MOOD_WORDS: Record<Exclude<Mood, "neutral">, Set<string>> = {
  dread: new Set([
    "blood",
    "death",
    "dread",
    "fear",
    "miedo",
    "muerte",
    "sangre",
    "shadow",
    "sombra",
    "terror",
  ]),
  sorrow: new Set([
    "duelo",
    "grief",
    "llanto",
    "lost",
    "perdido",
    "perdida",
    "sadness",
    "tristeza",
  ]),
  wonder: new Set([
    "dream",
    "light",
    "luz",
    "maravilla",
    "sueño",
    "sueno",
    "wonder",
  ]),
};

const SYMBOL_WORDS = new Map<string, string>([
  ["door", "door"],
  ["eye", "eye"],
  ["eyes", "eye"],
  ["espejo", "mirror"],
  ["espejos", "mirror"],
  ["espiral", "spiral"],
  ["espirales", "spiral"],
  ["key", "key"],
  ["keys", "key"],
  ["llave", "key"],
  ["llaves", "key"],
  ["luna", "moon"],
  ["mirror", "mirror"],
  ["mirrors", "mirror"],
  ["moon", "moon"],
  ["moons", "moon"],
  ["ojo", "eye"],
  ["ojos", "eye"],
  ["puerta", "door"],
  ["puertas", "door"],
  ["spiral", "spiral"],
  ["spirals", "spiral"],
]);

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase("es")
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isKeyword(word: string): boolean {
  return word.length > 2 && !STOPWORDS.has(word);
}

function classifyMood(words: string[]): Mood {
  const scores = {
    dread: words.filter((word) => MOOD_WORDS.dread.has(word)).length,
    sorrow: words.filter((word) => MOOD_WORDS.sorrow.has(word)).length,
    wonder: words.filter((word) => MOOD_WORDS.wonder.has(word)).length,
  };

  if (scores.dread >= scores.sorrow && scores.dread >= scores.wonder && scores.dread > 0) {
    return "dread";
  }
  if (scores.sorrow >= scores.wonder && scores.sorrow > 0) {
    return "sorrow";
  }
  if (scores.wonder > 0) {
    return "wonder";
  }
  return "neutral";
}

function clampThreatLevel(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function parseInscription(text: string): InscriptionSignals {
  const words = tokenize(text);
  const keywords = unique(words.filter(isKeyword)).slice(0, KEYWORD_LIMIT);
  const symbols = unique(
    words.map((word) => SYMBOL_WORDS.get(word)).filter((symbol): symbol is string => Boolean(symbol)),
  );
  const dreadHits = words.filter((word) => MOOD_WORDS.dread.has(word)).length;

  return {
    keywords,
    mood: classifyMood(words),
    threatLevel: clampThreatLevel(dreadHits * 25),
    symbols,
  };
}
