"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type FilterHit = { stem: string; squares: string[]; reads?: Record<string, string> };
export type FilterAnswer = { classes: string[]; frames: FilterHit[]; cells: number };
export type FilterProps = {
  name: string;
  /** The default query, answered on the server — so the first paint is the result, not a spinner. */
  initial: FilterAnswer;
  /** Hand the boards to the drilldown as its queue, with the matched squares outlined. */
  onQueue: (hits: FilterHit[], label: string) => void;
};

/** Steps a human actually asks for. 0.1 is the "show me anything at all" end. */
const STEPS = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9];
const DISAGREE = "disagree";
/**
 * Which side of the interval a frame sits on (`lib/session.ts` `FramePhase`). Worth its own
 * control because the two are different work: after the commit the FEN is true and only the
 * occluders are in question, before the next one the piece may already have moved.
 */
const PHASES: [string, string][] = [
  ["any", "either"],
  ["after", "after the move"],
  ["before", "before the next"],
];
export const DEFAULT_CLASS = "occluded";
export const DEFAULT_MIN = 0.1;

/**
 * Ask the model a question, get BOARDS back.
 *
 * The producer's own thresholds answer one question ("is this cell occluded enough to propose")
 * and the relabel work needs many more — "every board with any occluded suspicion at all",
 * "every board where the model reads a piece the FEN does not have" (the night-light identity
 * gap, which no occluded threshold surfaces). So the model ships its full distribution per cell
 * and this asks it. The result is a WORK QUEUE of boards, because the brush works on boards.
 */
export function FilterBar({ name, initial, onQueue }: FilterProps) {
  const [klass, setKlass] = useState(DEFAULT_CLASS);
  const [min, setMin] = useState(DEFAULT_MIN);
  const [phase, setPhase] = useState("any");
  const [answer, setAnswer] = useState(initial);
  const [note, setNote] = useState("");

  // Re-queried from event handlers only. The default query is answered on the server, so there
  // is no effect here to fire on mount — which is also what keeps
  // `react-hooks/set-state-in-effect` satisfied instead of suppressed.
  async function run(nextClass: string, nextMin: number, nextPhase = phase) {
    setKlass(nextClass);
    setMin(nextMin);
    setPhase(nextPhase);
    try {
      const res = await fetch(`/api/filter/${name}?class=${nextClass}&min=${nextMin}&phase=${nextPhase}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setAnswer(body);
      setNote("");
    } catch (error) {
      setNote(String(error));
    }
  }

  const { classes, frames: hits, cells } = answer;

  const base = klass === DISAGREE ? `model ≠ FEN (≥ ${min})` : `${klass} ≥ ${min}`;
  const label = phase === "any" ? base : `${base} · ${phase} the move`;

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="font-medium">show boards where</span>
        <select
          className="border-border bg-background rounded border px-2 py-1 font-mono"
          onChange={(e) => void run(e.target.value, min)}
          value={klass}
        >
          <option value={DISAGREE}>the model disagrees with the FEN</option>
          {(classes.length ? classes : ["occluded"]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span>≥</span>
        <span className="flex gap-1">
          {STEPS.map((s) => (
            <Button key={s} onClick={() => void run(klass, s)} size="sm" variant={min === s ? "default" : "outline"}>
              {s}
            </Button>
          ))}
        </span>
        <span className="flex items-center gap-1">
          <span>and the frame is</span>
          {PHASES.map(([value, text]) => (
            <Button
              key={value}
              onClick={() => void run(klass, min, value)}
              size="sm"
              variant={phase === value ? "default" : "outline"}
            >
              {text}
            </Button>
          ))}
        </span>
        {hits === null ? <Badge variant="secondary">…</Badge> : null}
      </div>

      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}

      {hits ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">
            {hits.length} boards · {cells} cells
          </Badge>
          <Button disabled={hits.length === 0} onClick={() => onQueue(hits, label)} size="sm">
            relabel these {hits.length} boards →
          </Button>
        </div>
      ) : null}

      <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-6">
        {(hits ?? []).slice(0, 60).map((hit) => (
          <button
            className="border-border hover:border-primary rounded border p-2 text-left font-mono text-xs"
            key={hit.stem}
            onClick={() => onQueue([hit], `${label} · frame ${hit.stem}`)}
            type="button"
          >
            <div>{hit.stem}</div>
            <div className="text-muted-foreground">
              {hit.squares.length} cells: {hit.squares.slice(0, 6).join(" ")}
              {hit.squares.length > 6 ? " …" : ""}
            </div>
          </button>
        ))}
      </div>
      {hits && hits.length > 60 ? (
        <p className="text-muted-foreground text-xs">
          showing the 60 boards with the most hits — narrow the filter to see the rest
        </p>
      ) : null}
    </div>
  );
}
