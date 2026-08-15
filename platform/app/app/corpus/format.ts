/** Locale-free formatting: the thin space of the concept's mockups, deterministic on server and client. */
export const num = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");

export const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits).replace(".", ",")} %`;

/** Nothing measured is "—", never 0 — a producer that never ran has not counted to zero. */
export const orDash = (value: number | null | undefined) => (value === null || value === undefined ? "—" : num(value));
