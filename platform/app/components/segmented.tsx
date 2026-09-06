/** The frame around a row of segments — the chain's steps, the labeln lanes, the corpus datasets. */
export const SEGMENTS = "border-border flex min-w-0 overflow-x-auto rounded-lg border";

/** One segment: the chosen one filled, an empty one quiet, every one after the first with a seam. */
export function segment(active: boolean, occupied: boolean, first: boolean): string {
  return [
    "min-w-0 cursor-pointer px-3 py-2 text-xs no-underline hover:bg-accent/60 max-sm:min-h-11",
    first ? "" : "border-border border-l",
    active ? "bg-accent text-foreground" : occupied ? "text-foreground" : "text-muted-foreground",
  ].join(" ");
}
