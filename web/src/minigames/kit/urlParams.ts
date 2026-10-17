export type UrlParams = Record<string, string | number>;

export function readSearch(): URLSearchParams {
  return new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
}

export function positiveInt(raw: string | null): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function withParams(url: URL, params: UrlParams): URL {
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url;
}

export function replaceSearch(params: UrlParams): void {
  window.history.replaceState(null, "", withParams(new URL(window.location.href), params));
}

export function shareUrl(params: UrlParams): string {
  const url = new URL(window.location.href);
  url.search = "";
  return withParams(url, params).toString();
}
