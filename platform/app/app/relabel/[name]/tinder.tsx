"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * A resting hand produces DOZENS of near-identical cards: same square, same underlying piece,
 * neighbouring frames. That is one physical event, so it can be decided as one — cards within
 * this many frames (5 s at 30 fps) of the current one join its group.
 */
const GROUP_SPAN = 150;

export type TinderProps = {
  name: string;
  sessionId: string;
  cells: Proposal[];
  /** Cells already in corrections.jsonl — skipped, because deciding twice is deciding once. */
  decided: Record<string, string>;
  onWritten: (n: number) => void;
  onError: (error: unknown) => void;
  /** Fired when the band runs empty — the session-done banner listens. */
  onDone?: () => void;
};

/** One decision (single card or a whole group), so `z` can put ALL of it back. */
type Done = { cells: Proposal[]; label: string | null; at: number };

const keyOf = (c: Proposal) => `${c.frame}|${c.square}`;

/**
 * One card at a time for the band the producer is unsure about (lo ≤ score ≤ hi) and for every
 * exception the grid threw out. Keep writes NOTHING: the FEN already says that, and a row that
 * repeats the FEN is noise in a global training input.
 */
export function TinderBand(props: TinderProps) {
  const { name, sessionId, cells: all, decided, onWritten, onError, onDone } = props;
  const [showDone, setShowDone] = useState(false);
  // Work already done does not come back. `showDone` is the "except when I ask for it" half.
  const cells = useMemo(
    () => (showDone ? all : all.filter((c) => !decided[keyOf(c)])),
    [all, decided, showDone],
  );
  const hidden = all.length - cells.length;
  const [index, setIndex] = useState(0);
  const [stack, setStack] = useState<Done[]>([]);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const swipe = useRef<number | null>(null);

  const nextFree = useCallback(
    (from: number, skip: Set<string>) => {
      let i = from;
      while (i < cells.length && skip.has(keyOf(cells[i]))) i += 1;
      return i;
    },
    [cells],
  );

  const at = nextFree(index, handled);
  const cell = cells[at];

  /** The current card's physical EVENT: same square, same piece, neighbouring frames, undecided. */
  const group = useMemo(
    () =>
      cell
        ? cells.filter(
            (c, i) =>
              i !== at &&
              !handled.has(keyOf(c)) &&
              c.square === cell.square &&
              c.fen_label === cell.fen_label &&
              Math.abs(Number(c.frame) - Number(cell.frame)) <= GROUP_SPAN,
          )
        : [],
    [cell, cells, at, handled],
  );

  // The band ran empty — tell the session-done banner. Keyed on the boolean, so late-arriving
  // bucket exceptions (cells grows, cell exists again) legitimately un-fire and re-fire it.
  const empty = cells.length > 0 && !cell;
  useEffect(() => {
    if (empty) onDone?.();
  }, [empty, onDone]);

  const decide = useCallback(
    async (label: string | null, wholeGroup = false) => {
      if (!cell) return;
      const batch = wholeGroup ? [cell, ...group] : [cell];
      try {
        if (label) {
          onWritten(
            await writeRows(
              batch.map((c) => ({ session_id: sessionId, frame: c.frame, square: c.square, label })),
            ),
          );
        }
        setStack((s) => [...s, { cells: batch, label, at }]);
        setHandled((h) => new Set([...h, ...batch.map(keyOf)]));
        setIndex(at + 1);
      } catch (error) {
        onError(error);
      }
    },
    [cell, group, at, sessionId, onWritten, onError],
  );

  const undo = useCallback(async () => {
    const last = stack[stack.length - 1];
    if (!last) return;
    try {
      if (last.label) {
        // Rows cannot be unwritten, so they are overwritten: the FEN label, appended on top.
        onWritten(
          await writeRows(
            last.cells.map((c) => ({
              session_id: sessionId,
              frame: c.frame,
              square: c.square,
              label: c.fen_label,
            })),
          ),
        );
      }
      setStack((s) => s.slice(0, -1));
      setHandled((h) => {
        const next = new Set(h);
        for (const c of last.cells) next.delete(keyOf(c));
        return next;
      });
      setIndex(last.at);
    } catch (error) {
      onError(error);
    }
  }, [stack, sessionId, onWritten, onError]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const hit = PALETTE.find(([k]) => k === event.key);
      if (event.key === "ArrowLeft") void decide(null, event.shiftKey);
      else if (event.key === "ArrowRight" || event.key === "o") void decide("occluded", event.shiftKey);
      else if (event.key === "ArrowDown") setIndex((i) => nextFree(i, handled) + 1);
      else if (event.key === "z") void undo();
      else if (hit) void decide(hit[1]);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, nextFree, handled]);

  if (!cell) {
    return (
      <p className="text-muted-foreground text-sm">
        Band empty — {cells.length} cards done. Exceptions from the bucket grid land here.
      </p>
    );
  }

  const src = `/api/cell/${name}/${cell.frame}/${cell.square}?size=${BIG}`;
  const done = handled.size;
  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <Badge variant="outline">
          {done} done · {cells.length - done} left
        </Badge>
        {hidden > 0 || showDone ? (
          <Button onClick={() => setShowDone((s) => !s)} size="sm" variant="outline">
            {showDone ? "hide already labeled" : `show ${hidden} already labeled`}
          </Button>
        ) : null}
        <span className="font-mono">
          {cell.square} @ {cell.frame} · FEN says {cell.fen_label} · score {cell.score.toFixed(2)}
        </span>
        {group.length > 0 ? (
          <Badge variant="secondary">
            same event: {group.length + 1} cards · Shift+←/→ decides them all
          </Badge>
        ) : null}
        <span className="text-muted-foreground ml-auto">
          <kbd>←</kbd> keep · <kbd>→</kbd> occluded · <kbd>Shift</kbd> = whole event ·{" "}
          <kbd>↓</kbd> skip · <kbd>z</kbd> undo · digits/letters = piece, <kbd>x</kbd> empty
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
        {group.length > 0 ? (
          <>
            <Button onClick={() => void decide("occluded", true)} variant="default">
              Shift+→ event occluded ({group.length + 1})
            </Button>
            <Button onClick={() => void decide(null, true)} variant="outline">
              Shift+← event keep
            </Button>
          </>
        ) : null}
        <Button onClick={() => setIndex(nextFree(index, handled) + 1)} variant="outline">
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

      {stack.length > 0 ? (
        <div className="text-muted-foreground border-border rounded-lg border p-3 font-mono text-xs">
          <span className="text-foreground mr-2 font-sans font-medium">deine letzten Entscheidungen:</span>
          {stack
            .slice(-8)
            .reverse()
            .map((d, i) => (
              <span key={`${d.at}-${i}`} className="mr-3 whitespace-nowrap">
                {d.cells[0].square}@{d.cells[0].frame}
                {d.cells.length > 1 ? `×${d.cells.length}` : ""} → {d.label ?? `keep ${d.cells[0].fen_label}`}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}
