import { clamp01 } from "../../shared/math";

export type Stance =
  | "confession"
  | "intellectualization"
  | "anesthesia"
  | "deflection"
  | "ritualization";

export interface StanceProfile {
  stance: Stance;
  confidence: number;
  signals: string[];
  bodyPresence: number;
  abstractionLevel: number;
  emotionalExposure: number;
}

const BODY_TERMS = [
  "pecho", "estomago", "garganta", "cuerpo", "piel", "mano", "manos", "cabeza",
  "espalda", "vientre", "panza", "musculo", "hombro", "hombros", "pulso", "latido",
  "respiracion", "duele", "dolor", "arde", "aprieta", "tiembla", "nausea", "mareo",
  "nudo", "puno", "sangre", "huesos", "carne", "boca", "ojos",
];

const EMOTION_TERMS = [
  "miedo", "triste", "tristeza", "solo", "sola", "soledad", "ansiedad", "angustia",
  "rabia", "enojo", "culpa", "verguenza", "vulnerable", "fragil", "llorar", "lloro",
  "perdido", "perdida", "dolido", "herido", "asustado", "asustada", "desesperado",
];

const CAUSAL_TERMS = [
  "porque", "debido a", "se debe", "ya que", "por eso", "por lo tanto", "dado que",
  "a causa de", "la razon", "el motivo", "es por", "esto explica", "puesto que",
];

const ABSTRACTION_TERMS = [
  "patron", "patrones", "neuroquimico", "neuro", "sistema", "proceso", "mecanismo",
  "estructura", "funcion", "nivel", "factor", "concepto", "teoria", "psicologic",
  "biologic", "quimic", "hormona", "cortisol", "dopamina", "serotonina", "cientific",
  "analisis", "logic", "peristalsis", "metabolismo", "sintoma", "diagnostic",
];

const HUMOR_META_TERMS = [
  "jaja", "jeje", "jiji", "jajaja", "lol", "xd", "que profundo", "siguiente pregunta",
  "siguiente", "cambiando de tema", "cambia de tema", "cambiemos de tema",
  "cambiar de tema", "pasemos a otra cosa", "otra cosa", "no quiero responder",
  "no quiero hablar", "no hablemos", "en fin", "como sea", "bla bla", "tipico",
  "obvio", "ironia", "sarcasm", "meta", "filosofia barata", "ya que estamos",
];

const SYMBOLIC_TERMS = [
  "arcano", "luna", "sombra", "ritual", "dios", "profecia", "espejo", "abismo",
  "alma", "espiritu", "sagrado", "oscuridad", "eterno", "cristal", "oraculo", "runa",
  "sigilo", "vacio", "umbral", "liturgia", "constelacion", "ceniza",
];

const ANESTHESIA_TERMS = [
  "no siento", "nada", "da igual", "me da igual", "no importa", "que mas da",
  "indiferente", "ni frio ni calor", "no se que siento", "todo igual", "neutro",
];

const FIRST_PERSON_TERMS = [
  "yo", "me", "mi", "mis", "conmigo", "siento", "estoy", "soy", "tengo", "me siento",
];

const DIACRITICS = /[̀-ͯ]/g;

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

function countHits(text: string, terms: string[]): number {
  let hits = 0;
  for (const term of terms) {
    if (text.includes(term)) hits++;
  }
  return hits;
}

function saturate(hits: number, full: number): number {
  return clamp01(hits / full);
}

export function classifyStance(input: string): StanceProfile {
  const text = normalize(input);

  const firstPerson = saturate(countHits(text, FIRST_PERSON_TERMS), 2);
  const bodyPresence = saturate(countHits(text, BODY_TERMS), 2);
  const emotionalExposure = saturate(countHits(text, EMOTION_TERMS), 2);
  const causal = saturate(countHits(text, CAUSAL_TERMS), 1);
  const abstractionLevel = saturate(countHits(text, ABSTRACTION_TERMS), 2);
  const humorMeta = saturate(countHits(text, HUMOR_META_TERMS), 1);
  const symbolic = saturate(countHits(text, SYMBOLIC_TERMS), 2);
  const flat = saturate(countHits(text, ANESTHESIA_TERMS), 1);

  const scores: Record<Stance, number> = {
    confession:
      1.0 * firstPerson + 1.2 * bodyPresence + 1.0 * emotionalExposure -
      0.8 * abstractionLevel - 0.6 * causal - 1.0 * humorMeta - 0.5 * symbolic - 0.8 * flat,
    intellectualization:
      1.4 * causal + 1.3 * abstractionLevel + 0.3 * firstPerson - 0.3 * bodyPresence,
    anesthesia: 1.6 * flat - 0.8 * emotionalExposure - 0.6 * bodyPresence,
    deflection: 1.6 * humorMeta - 0.5 * emotionalExposure - 0.5 * bodyPresence,
    ritualization: 1.5 * symbolic + 0.2 * firstPerson - 0.5 * bodyPresence - 0.5 * causal,
  };

  const ranked = (Object.keys(scores) as Stance[]).sort((a, b) => scores[b] - scores[a]);
  const stance = ranked[0];
  const top = scores[stance];
  const second = scores[ranked[1]];
  const confidence = clamp01(top <= 0 ? 0 : (top - second) / (top + 1e-6));

  const signals: string[] = [];
  if (firstPerson > 0) signals.push("first-person");
  if (bodyPresence > 0) signals.push("body-term");
  if (emotionalExposure > 0) signals.push("emotion-term");
  if (causal > 0) signals.push("causal-chain");
  if (abstractionLevel > 0) signals.push("abstraction");
  if (humorMeta > 0) signals.push("humor-meta");
  if (symbolic > 0) signals.push("symbolic-language");
  if (flat > 0) signals.push("flat-negation");

  return { stance, confidence, signals, bodyPresence, abstractionLevel, emotionalExposure };
}
