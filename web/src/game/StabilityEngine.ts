export interface StabilityState {
  stability: number;
  dread: number;
  elapsed: number;
}

const MIN_VALUE = 0;
const MAX_VALUE = 100;
const BASE_DECAY_PER_SECOND = 1;
const DREAD_DECAY_MULTIPLIER = 2;
const FALSE_DOOR_PENALTY = 45;
const SAFE_DOOR_REWARD = 10;

function clamp(value: number): number {
  return Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
}

export class StabilityEngine {
  private _stability: number;
  private _dread: number;
  private _elapsed: number;

  constructor(opts?: { stability?: number; dread?: number }) {
    this._stability = clamp(opts?.stability ?? MAX_VALUE);
    this._dread = clamp(opts?.dread ?? MIN_VALUE);
    this._elapsed = 0;
  }

  tick(dt: number): void {
    this._elapsed += dt;
    const dreadScale = 1 + (this._dread / MAX_VALUE) * DREAD_DECAY_MULTIPLIER;
    this._stability = clamp(
      this._stability - dt * BASE_DECAY_PER_SECOND * dreadScale
    );
  }

  setDread(d: number): void {
    this._dread = clamp(d);
  }

  falseDoorPenalty(): void {
    this._stability = clamp(this._stability - FALSE_DOOR_PENALTY);
  }

  safeDoorReward(): void {
    this._stability = clamp(this._stability + SAFE_DOOR_REWARD);
  }

  get isEvicted(): boolean {
    return this._stability <= MIN_VALUE;
  }

  get state(): StabilityState {
    return {
      stability: this._stability,
      dread: this._dread,
      elapsed: this._elapsed,
    };
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  static deserialize(s: string): StabilityEngine {
    const state = JSON.parse(s) as StabilityState;
    const engine = new StabilityEngine({
      stability: state.stability,
      dread: state.dread,
    });
    engine._elapsed = state.elapsed;
    return engine;
  }
}
