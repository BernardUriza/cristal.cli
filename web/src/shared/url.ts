export type UrlParams = Record<string, string | number>;

function currentSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

export function searchParams(search = currentSearch()): URLSearchParams {
  return new URLSearchParams(search);
}

export function stringParam(name: string, search = currentSearch()): string | null {
  return searchParams(search).get(name);
}

export function flagParam(name: string, search = currentSearch()): boolean | null {
  const value = stringParam(name, search);
  if (value === null) return null;
  return value !== "0" && value !== "off" && value !== "false";
}

export function numberParam(name: string, search = currentSearch()): number | null {
  const value = stringParam(name, search);
  return value === null ? null : Number(value);
}

export function positiveIntParam(name: string, search = currentSearch()): number | null {
  const n = Number(stringParam(name, search));
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
