"use client";

import { DISAGREE, STEPS, type Filter } from "@/lib/query";

/** Which side of the interval a frame sits on (`lib/session-store/session.ts` `FramePhase`) — different work. */
const PHASES: [string, string][] = [
  ["any", "beide"],
  ["after", "nach dem Zug"],
  ["before", "vor dem nächsten"],
];

const CHIP = "cursor-pointer rounded-md border px-2 py-1 text-xs max-sm:h-11 max-sm:px-3";
const ON = "border-primary bg-primary text-primary-foreground";
const OFF = "border-border hover:bg-accent/50";

export type WallQueryBarProps = {
  classes: string[];
  filter: Filter;
  phase: string;
  cells: number;
  ms: number;
  busy: boolean;
  onAsk: (filter: Filter, phase: string) => void;
};

/**
 * `Klassenwand`'s question, in the stream head: which class, how sure, which side of the move. It
 * cannot be answered in the browser — `StreamCell` carries no `probs` and must not (58 MB) — so
 * every control is a round trip to `/api/query` and the hit count is the server's own.
 */
export function WallQueryBar({ classes, filter, phase, cells, ms, busy, onAsk }: WallQueryBarProps) {
  // Blurred like the lane chips: the stream listens on `window` and a focused button eats the Enter.
  const pick = (event: { currentTarget: HTMLButtonElement }, next: Filter, nextPhase: string) => {
    event.currentTarget.blur();
    onAsk(next, nextPhase);
  };
  return (
    <div className="border-border flex flex-wrap items-center gap-1 rounded-md border px-2 py-1 text-xs">
      <span className="text-muted-foreground">Zellen, auf denen</span>
      <select
        className="border-border bg-background rounded-md border px-1.5 py-1 font-mono max-sm:h-11"
        onChange={(e) => onAsk({ ...filter, klass: e.target.value }, phase)}
        value={filter.klass}
      >
        <option value={DISAGREE}>das Modell dem FEN widerspricht</option>
        {classes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">ab</span>
      {STEPS.map((s) => (
        <button
          className={`${CHIP} tabular-nums ${filter.min === s ? ON : OFF}`}
          key={s}
          onClick={(e) => pick(e, { ...filter, min: s }, phase)}
          type="button"
        >
          {s}
        </button>
      ))}
      <span className="text-muted-foreground ml-1">Bild</span>
      {PHASES.map(([value, text]) => (
        <button
          className={`${CHIP} ${phase === value ? ON : OFF}`}
          key={value}
          onClick={(e) => pick(e, filter, value)}
          type="button"
        >
          {text}
        </button>
      ))}
      <span className="text-muted-foreground ml-auto tabular-nums">
        {busy ? "fragt …" : `${cells} Treffer · ${ms} ms`}
      </span>
    </div>
  );
}
