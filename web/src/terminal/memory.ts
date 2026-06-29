// Port of the subset of Cristal.CLI.Memory.CristalMemory used by the response
// system. Persists to localStorage so the session survives reloads.

interface CommandEntry {
  input: string;
  ts: number;
  emotionalWeight: number;
}

interface MemoryData {
  sessionId: string;
  commands: CommandEntry[];
  keywords: Record<string, number>;
  flags: Record<string, boolean>;
  corruptionLevel: number; // 0-1
  dominantEmotion: string;
  arcanaUnlocked: string[];
  majorEvents: string[];
}

const STORAGE_KEY = "cristal.memory.v1";
const RECENT_EMOTION_WINDOW = 10;

function randomSessionId(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `FRACTURE_00_${letter}${num}`;
}

export class CristalMemory {
  private data: MemoryData;

  constructor() {
    this.data = this.load();
  }

  private load(): MemoryData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...this.fresh(), ...(JSON.parse(raw) as MemoryData) };
    } catch {
      /* ignore corrupt storage */
    }
    return this.fresh();
  }

  private fresh(): MemoryData {
    return {
      sessionId: randomSessionId(),
      commands: [],
      keywords: {},
      flags: {},
      corruptionLevel: 0,
      dominantEmotion: "neutral",
      arcanaUnlocked: [],
      majorEvents: [],
    };
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage may be unavailable */
    }
  }

  get sessionId(): string {
    return this.data.sessionId;
  }

  get commandCount(): number {
    return this.data.commands.length;
  }

  get corruptionLevel(): number {
    return this.data.corruptionLevel;
  }

  get dominantEmotion(): string {
    return this.data.dominantEmotion;
  }

  get arcanaUnlockedCount(): number {
    return this.data.arcanaUnlocked.length;
  }

  get majorEventsCount(): number {
    return this.data.majorEvents.length;
  }

  get discoveredKeywordCount(): number {
    return Object.keys(this.data.keywords).length;
  }

  logCommand(input: string, keywords: string[], emotionalWeight: number) {
    this.data.commands.push({ input, ts: Date.now(), emotionalWeight });
    for (const k of keywords) {
      this.data.keywords[k] = (this.data.keywords[k] ?? 0) + 1;
    }
    // Corruption creeps up slightly with negative-weight inputs.
    if (emotionalWeight < 0) {
      this.data.corruptionLevel = Math.min(1, this.data.corruptionLevel + 0.02);
    }
    this.recomputeDominantEmotion();
    this.save();
  }

  private recomputeDominantEmotion() {
    const avg = this.getEmotionalAverage();
    this.data.dominantEmotion = avg > 0.2 ? "hopeful" : avg < -0.2 ? "fearful" : "neutral";
  }

  getEmotionalAverage(): number {
    const recent = this.data.commands.slice(-RECENT_EMOTION_WINDOW);
    if (recent.length === 0) return 0;
    return recent.reduce((s, c) => s + c.emotionalWeight, 0) / recent.length;
  }

  getRandomCommand(): CommandEntry | null {
    const c = this.data.commands;
    return c.length ? c[Math.floor(Math.random() * c.length)] : null;
  }

  getTopKeywords(n: number): string[] {
    return Object.entries(this.data.keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  }

  getFlag(flag: string): boolean {
    return this.data.flags[flag] ?? false;
  }

  setFlag(flag: string, value: boolean) {
    this.data.flags[flag] = value;
    this.save();
  }

  isArcanaUnlocked(id: string): boolean {
    return this.data.arcanaUnlocked.includes(id);
  }

  unlockArcana(id: string) {
    if (!this.data.arcanaUnlocked.includes(id)) {
      this.data.arcanaUnlocked.push(id);
      this.save();
    }
  }

  recordMajorEvent(event: string) {
    this.data.majorEvents.push(event);
    this.save();
  }

  reset() {
    this.data = this.fresh();
    this.save();
  }
}
