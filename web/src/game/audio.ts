// Procedural audio for the dream rooms — synthesised with WebAudio, no asset
// files. A dread-tuned drone on entering a room, a downward whoosh on crossing
// a door. The context is created lazily and resumed on first use so it survives
// the browser autoplay policy (the player has already clicked / pressed a key).

let ctx: AudioContext | null = null;

export function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Low drone whose pitch and dissonance rise with dread.
export function playEnterDrone(dread: number): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const dr = Math.max(0, Math.min(100, dread)) / 100;

  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc2.type = "sawtooth";
  const base = 52 + dr * 26;
  osc.frequency.setValueAtTime(base, t);
  osc2.frequency.setValueAtTime(base * 1.5 + dr * 10, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.1 + dr * 0.06, t + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + 2.7);
  osc2.stop(t + 2.7);
}

// Downward sweep + filtered noise puff when stepping through a door.
export function playCross(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.42);

  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.3), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 760;
  const ngain = ac.createGain();
  ngain.gain.setValueAtTime(0.07, t);
  ngain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  noise.connect(filter);
  filter.connect(ngain);
  ngain.connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.3);
}

// Harsh dissonant cluster for a false door or a collapsing room — it bites.
export function playAlarm(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.16, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  gain.connect(ac.destination);
  for (const f of [110, 116, 164]) {
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.85);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.9);
  }
}
