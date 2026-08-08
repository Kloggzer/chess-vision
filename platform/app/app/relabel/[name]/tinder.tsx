"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/proposals";
import { writeRows } from "./write";

const BIG = 256;
const THUMB = 320;
/** FEN's own convention: digits pick the white piece, the lower-case letter its black twin. */
const PALETTE: [string, string][] = [
  ["1", "wP"], ["2", "wN"], ["3", "wB"], ["4", "wR"], ["5", "wQ"], ["6", "wK"],
  ["p", "bP"], ["n", "bN"], ["b", "bB"], ["r", "bR"], ["q", "bQ"], ["k", "bK"],
  ["x", "empty"],
];

export type TinderProps = {
  name: string;
  sessionId: string;
  cells: Proposal[];
  onWritten: (n: number) => void;
  onError: (error: unknown) => void;
  /** Fired when the band runs empty — the session-done banner listens. */
  onDone?: () => void;
};

/** What the last decision did, so `z` can put it back — a superseding row, last line wins. */
type Done = { cell: Proposal; label: string | null };

/**
 * One card at a time for the band the producer is unsure about (lo ≤ score ≤ hi) and for every
 * exception the grid threw out. Keep writes NOTHING: the FEN already says that, and a row that
 * repeats the FEN is noise in a global training input.
 */
export function TinderBand({ name, sessionId, cells, onWritten, onError, onDone }: TinderProps) {
  const [index, setIndex] = useState(0);
  const [stack, setStack] = useState<Done[]>([]);
  const cell = cells[index];
  const swipe = useRef<number | null>(null);

  // The band ran empty — tell the session-done banner. Keyed on the boolean, so late-arriving
  // bucket exceptions (cells grows, cell exists again) legitimately un-fire and re-fire it.
  const empty = cells.length > 0 && !cell;
  useEffect(() => {
    if (empty) onDone?.();
  }, [empty, onDone]);

  const decide = useCallback(
    async (label: string | null) => {
      if (!cell) return;
      try {
        if (label) {
          onWritten(
            await writeRows([
              { session_id: sessionId, frame: cell.frame, square: cell.square, label },
            ]),
          );
        }
        setStack((s) => [...s, { cell, label }]);
        setIndex((i) => i + 1);
      } catch (error) {
        onError(error);
      }
    },
    [cell, sessionId, onWritten, onError],
  );

  const undo = useCallback(async () => {
    const last = stack[stack.length - 1];
    if (!last) return;
    try {
      if (last.label) {
        // The row cannot be unwritten, so it is overwritten: the FEN label, appended on top.
        onWritten(
          await writeRows([
            {
              session_id: sessionId,
              frame: last.cell.frame,
              square: last.cell.square,
              label: last.cell.fen_label,
            },
          ]),
        );
      }
      setStack((s) => s.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
    } catch (error) {
      onError(error);
    }
  }, [stack, sessionId, onWritten, onError]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const hit = PALETTE.find(([k]) => k === event.key);
      if (event.key === "ArrowLeft") void decide(null);
      else if (event.key === "ArrowRight" || event.key === "o") void decide("occluded");
      else if (event.key === "ArrowDown") setIndex((i) => i + 1);
      else if (event.key === "z") void undo();
      else if (hit) void decide(hit[1]);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo]);

  if (!cell) {
    return (
      <p className="text-muted-foreground text-sm">
        Band empty — {cells.length} cards done. Exceptions from the bucket grid land here.
      </p>
    );
  }

  const src = `/api/cell/${name}/${cell.frame}/${cell.square}?size=${BIG}`;
  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <Badge variant="outline">
          {index + 1} / {cells.length}
        </Badge>
        <span className="font-mono">
          {cell.square} @ {cell.frame} · FEN says {cell.fen_label} · score {cell.score.toFixed(2)}
        </span>
        <span className="text-muted-foreground ml-auto">
          <kbd>←</kbd> keep · <kbd>→</kbd> occluded · <kbd>↓</kbd> skip · <kbd>z</kbd> undo · digits
          = white piece, letters = black, <kbd>x</kbd> empty
        </span>
      </div>

      <div
        className="grid gap-4 md:grid-cols-[repeat(3,max-content)]"
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          const dx = e.clientX - (swipe.current ?? e.clientX);
          swipe.current = null;
          if (Math.abs(dx) > 60) void decide(dx > 0 ? "occluded" : null);
        }}
        style={{ touchAction: "pan-y" }}
      >
        <figure>
          <Image alt="cell now" height={BIG} src={src} unoptimized width={BIG} />
          <figcaption className="text-muted-foreground text-xs">now — is this an occluder?</figcaption>
        </figure>
        <figure>
          <Image alt="clean median" height={BIG} src={`${src}&median=1`} unoptimized width={BIG} />
          <figcaption className="text-muted-foreground text-xs">
            clean median of this ply&apos;s interval
          </figcaption>
        </figure>
        <figure className="relative">
          <Image
            alt={`board ${cell.frame}`}
            height={THUMB}
            src={`/api/board/${name}/${cell.frame}?size=${THUMB}`}
            unoptimized
            width={THUMB}
          />
          <span
            className="pointer-events-none absolute border-2 border-amber-400"
            style={{
              left: (cell.square.charCodeAt(0) - 97) * (THUMB / 8),
              top: (8 - Number(cell.square[1])) * (THUMB / 8),
              width: THUMB / 8,
              height: THUMB / 8,
            }}
          />
          <figcaption className="text-muted-foreground text-xs">the whole board</figcaption>
        </figure>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void decide(null)} variant="outline">
          ← keep {cell.fen_label}
        </Button>
        <Button onClick={() => void decide("occluded")}>→ occluded</Button>
        <Button onClick={() => setIndex((i) => i + 1)} variant="outline">
          ↓ skip
        </Button>
        <Button disabled={stack.length === 0} onClick={() => void undo()} variant="secondary">
          z undo
        </Button>
        <span className="ml-2 flex flex-wrap gap-1">
          {PALETTE.map(([key, label]) => (
            <Button key={label} onClick={() => void decide(label)} size="sm" variant="ghost">
              <span className="text-muted-foreground mr-1 font-mono">{key}</span>
              {label}
            </Button>
          ))}
        </span>
      </div>
    </div>
  );
}
