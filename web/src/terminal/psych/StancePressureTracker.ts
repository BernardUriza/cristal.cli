import type { Stance } from "./StanceClassifier";
import { clamp01 } from "../../shared/math";
import { isEvasiveStance } from "./stanceUtils";

const WINDOW = 6;
const EVASION_STEP = 0.18;
const REPEAT_BONUS = 0.16;
const CONFESSION_RELIEF = 0.4;

export interface PressureState {
  pressure: number;
  consecutiveEvasion: number;
  repeatingStance: Stance | null;
  recent: Stance[];
}

export class StancePressureTracker {
  private _pressure = 0;
  private _recent: Stance[] = [];
  private _consecutive = 0;

  record(stance: Stance): void {
    const prev = this._recent[this._recent.length - 1];
    if (isEvasiveStance(stance)) {
      const repeat = prev === stance;
      this._consecutive = repeat ? this._consecutive + 1 : 1;
      this._pressure += EVASION_STEP + (repeat ? REPEAT_BONUS : 0);
    } else {
      this._consecutive = 0;
      this._pressure -= CONFESSION_RELIEF;
    }
    this._pressure = clamp01(this._pressure);
    this._recent.push(stance);
    if (this._recent.length > WINDOW) this._recent.shift();
  }

  get state(): PressureState {
    const last = this._recent[this._recent.length - 1];
    const repeatingStance =
      this._consecutive >= 2 && last && isEvasiveStance(last) ? last : null;
    return {
      pressure: this._pressure,
      consecutiveEvasion: this._consecutive,
      repeatingStance,
      recent: [...this._recent],
    };
  }

  reset(): void {
    this._pressure = 0;
    this._recent = [];
    this._consecutive = 0;
  }
}
