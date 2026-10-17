let lastActivityAt = 0;

export function markInputActivity(now: number): void {
  lastActivityAt = now;
}

export function lastInputActivityAt(): number {
  return lastActivityAt;
}
