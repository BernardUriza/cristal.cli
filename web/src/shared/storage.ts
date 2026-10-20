export type StorageArea = "local" | "session";

export function browserStorage(kind: StorageArea = "local"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readText(key: string, kind: StorageArea = "local"): string | null {
  try {
    return browserStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string, kind: StorageArea = "local"): void {
  try {
    browserStorage(kind)?.setItem(key, value);
  } catch {
    return;
  }
}

export function readJson(key: string, kind: StorageArea = "local"): unknown {
  const raw = readText(key, kind);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, kind: StorageArea = "local"): void {
  writeText(key, JSON.stringify(value), kind);
}

export function flagStore(key: string, fallback: boolean): { load: () => boolean; save: (on: boolean) => void } {
  return {
    load: () => {
      const raw = readText(key);
      return raw === null ? fallback : raw === "on";
    },
    save: (on) => writeText(key, on ? "on" : "off"),
  };
}
