export type ResponseContext = "welcome" | "input";

export type ShapeableResponse = { lines: string[]; delayMs?: number };

export type ResponseShaper = <T extends ShapeableResponse>(response: T, context: ResponseContext) => T;

let shaper: ResponseShaper = (response) => response;

export function shapeTerminalResponses(next: ResponseShaper): void {
  shaper = next;
}

export function shapeResponse<T extends ShapeableResponse>(response: T, context: ResponseContext): T {
  return shaper(response, context);
}
