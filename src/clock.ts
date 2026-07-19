// Injectable clock for time-based behavior. Override in tests.

let clockFn: () => Date = () => new Date();

export function now(): Date {
  return clockFn();
}

export function setClock(fn: () => Date): void {
  clockFn = fn;
}

export function resetClock(): void {
  clockFn = () => new Date();
}
