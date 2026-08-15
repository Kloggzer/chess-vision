/** Bar geometry, kept out of the components so the axis of a chart can be asserted in a test. */

/** The axis top: the next 1 / 2 / 5 × 10ⁿ at or above the largest bar, so ticks stay readable. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((factor) => value <= factor * power + Number.EPSILON) ?? 10;
  return step * power;
}

/** Clamped: a bar past the axis top would run out of its track instead of overstating itself. */
export function barPct(value: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/** Nulls are dropped, never read as 0 — a metric the producer never wrote must not size an axis. */
export function maxOf(values: readonly (number | null | undefined)[]): number {
  return values.reduce<number>((top, value) => (typeof value === "number" ? Math.max(top, value) : top), 0);
}
