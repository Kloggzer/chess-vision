"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Correction } from "@/lib/corrections";
import { FILES, fenLabels } from "@/lib/fen";
import { writeRows } from "./write";

export type FrameInfo = {
  stem: string;
  ply: number;
  fen: string;
  /** Where in the interval this frame sits — see `lib/session.ts` `FramePhase`. Absent on a
   *  frame the queue synthesized without a log row. */
  phase?: "settled" | "after" | "before";
  sinceS?: number;
  toS?: number;
  unknown?: string[];
};
export type DrilldownProps = {
  name: string;
  sessionId: string;
  frames: FrameInfo[];
  decided: Record<string, string>;
  onWritten: (n: number) => void;
  onError: (error: unknown) => void;
  /** Squares the active filter hit on each frame — outlined, so the eye starts where the work is. */
  hits?: Record<string, string[]>;
  /** `{stem: {square: "wP 0.87"}}` — what the model reads there, printed in the cell. */
  reads?: Record<string, Record<string, string>>;
  /** `{stem: {square: label}}` — what "yes, correct" writes per matched cell. The API decides it,
   *  because only the query knows what it asked (see the filter route). */
  accepts?: Record<string, Record<string, string>>;
  /** Where the queue came from, for the header line. */
  queueNote?: string;
};

const SQUARES = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`);

/**
 * What the brush can be loaded with, and the key that loads it.
 *
 * FEN's own convention, so the keys are the ones a chess player already knows: digits are the
 * white pieces in FEN order, the lower-case letter is the black twin. `o` and `x` are the two
 * that are not pieces at all.
 */
const PALETTE: [string, string][] = [
  ["o", "occluded"], ["x", "empty"],
  ["1", "wP"], ["2", "wN"], ["3", "wB"], ["4", "wR"], ["5", "wQ"], ["6", "wK"],
  ["p", "bP"], ["n", "bN"], ["b", "bB"], ["r", "bR"], ["q", "bQ"], ["k", "bK"],
];
/** `{stem: {square: label}}` — per frame, so stepping to the next one resets nothing. */
type ByFrame = Record<string, Record<string, string>>;

/**
 * The rectified board with an 8x8 overlay. An occluder covers a CONTIGUOUS swath, so the primary
 * gesture is a BRUSH: pointer-down and drag marks every cell the pointer enters `occluded`, the
 * eraser (or the right button) puts the FEN label back. A click without a drag keeps the cycle.
 *
 * Pointer-enter bookkeeping over plain divs — one entered cell is one state update, no canvas.
 */
export function Drilldown(props: DrilldownProps) {
  const { name, sessionId, frames, decided, onWritten, onError, hits, reads, accepts, queueNote } = props;
  /**
   * A board still worth stopping at: one with a matched cell nobody has ruled on. Boards whose
   * every hit is already decided are behind you, and the queue used to reopen at index 0 on every
   * mount and reload — so a session that was half done looked untouched ("board queue lässt mich
   * immer von vorne anfangen", 2026-08-09). Without a filter queue every board qualifies, which
   * is the old behaviour for the unfiltered drilldown.
   */
  const open = useCallback(
    (f: FrameInfo) => {
      const cells = accepts?.[f.stem];
      if (!cells) return true;
      return Object.keys(cells).some((sq) => decided[`${f.stem}|${sq}`] === undefined);
    },
    [accepts, decided],
  );
  const [at, setAt] = useState(() => Math.max(0, frames.findIndex(open)));
  const [eraser, setEraser] = useState(false);
  /** What the brush lays down. `occluded` is the common case, not the only one. */
  const [brush, setBrush] = useState("occluded");
  const [edits, setEdits] = useState<ByFrame>({});
  /** What already left through the writer — the baseline the unsaved diff is measured against. */
  const [saved, setSaved] = useState<ByFrame>({});

  const frame = frames[at];
  const stem = frame?.stem ?? "";
  const fen = useMemo(() => fenLabels(frame?.fen ?? ""), [frame]);
  const base = useMemo(() => {
    const out: Record<string, string> = {};
    for (const sq of SQUARES) out[sq] = decided[`${stem}|${sq}`] ?? fen[sq];
    return out;
  }, [decided, fen, stem]);

  const labels = useMemo(() => ({ ...base, ...edits[stem] }), [base, edits, stem]);
  /**
   * Squares a HUMAN has ruled on — this session's edits plus what corrections.jsonl already
   * holds. Everything else carries the FEN's word, which is a good label and NOT a verdict:
   * "I painted occluded on e5" says nothing about the pawn on d4 except that nobody looked.
   */
  const judged = useMemo(
    () =>
      new Set(
        SQUARES.filter((sq) => decided[`${stem}|${sq}`] !== undefined || edits[stem]?.[sq] !== undefined),
      ),
    [decided, edits, stem],
  );
  const pending: Correction[] = useMemo(
    () =>
      SQUARES.filter((sq) => labels[sq] !== (saved[stem]?.[sq] ?? base[sq])).map((sq) => ({
        session_id: sessionId,
        frame: stem,
        square: sq,
        label: labels[sq],
      })),
    [labels, saved, base, stem, sessionId],
  );

  const flush = useCallback(
    async (rows: Correction[]) => {
      if (rows.length === 0) return;
      try {
        onWritten(await writeRows(rows));
        const written = Object.fromEntries(rows.map((r) => [r.square, r.label]));
        setSaved((s) => ({ ...s, [rows[0].frame]: { ...s[rows[0].frame], ...written } }));
      } catch (error) {
        onError(error);
      }
    },
    [onWritten, onError],
  );

  // Writes on navigate-away, including leaving the view: an unmount cleanup cannot read state,
  // so the two moving parts are mirrored into refs from an effect (never during render).
  const latest = useRef<Correction[]>([]);
  const flushRef = useRef(flush);
  // Enter confirms the queue's answer, like the bucket grid's page — mirrored for the same reason:
  // the key listener is subscribed once and must still call the CURRENT closure.
  const confirmRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    latest.current = pending;
    flushRef.current = flush;
    confirmRef.current = confirmQueue;
  });
  useEffect(() => () => void flushRef.current(latest.current), []);

  // One key, one brush — the same letters the tinder band uses, so the two views are one habit.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        void confirmRef.current();
        return;
      }
      const hit = PALETTE.find(([k]) => k === event.key);
      if (!hit) return;
      event.preventDefault();
      setBrush(hit[1]);
      setEraser(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (square: string, label: string) =>
    setEdits((e) => ({ ...e, [stem]: { ...e[stem], [square]: label } }));

  const paint = (square: string, erase: boolean) => set(square, erase ? fen[square] : brush);
  const cycle = (square: string) => {
    // The cycle offers what this square could plausibly be: what the FEN says, what the brush is
    // loaded with, and empty — deduplicated, so a brush set to `empty` does not stall the cycle.
    const order = [...new Set([fen[square], brush, "empty"])];
    set(square, order[(order.indexOf(labels[square]) + 1) % order.length]);
  };

  const painting = useRef<{ start: string; erase: boolean; dragged: boolean } | null>(null);

  function enter(square: string) {
    const state = painting.current;
    if (!state) return;
    if (!state.dragged) {
      if (state.start === square) return; // still inside the cell the press started in
      state.dragged = true;
      paint(state.start, state.erase);
    }
    paint(square, state.erase);
  }

  function up() {
    const state = painting.current;
    painting.current = null;
    if (state && !state.dragged) cycle(state.start);
  }

  async function go(delta: number) {
    await flush(pending);
    setAt((i) => Math.max(0, Math.min(frames.length - 1, i + delta)));
  }

  /** The next board still worth stopping at, or the last one if the queue is worked through. */
  const nextOpen = (from: number) => {
    for (let i = from; i < frames.length; i++) if (open(frames[i])) return i;
    return frames.length - 1;
  };

  /**
   * "Yes, the filter is right here" — write the answer for the MATCHED cells only, then move on.
   *
   * The point of a filtered queue is that you are not reviewing 64 squares, you are answering one
   * question about a handful ("nicht immer alles kontrollieren, sondern nur das, wonach ich
   * gefiltert habe", 2026-08-09). So this touches nothing outside `accept`: the other cells keep
   * the FEN's word and stay unjudged, which is the honest record of what a human actually looked
   * at. A cell whose accepted label already matches what is on file writes no row.
   */
  const accept = accepts?.[stem] ?? {};
  /** So a half-worked queue does not look untouched — the count is the honest progress bar. */
  const stillOpen = accepts ? frames.filter(open).length : frames.length;
  const acceptCells = Object.keys(accept);
  const acceptLabels = [...new Set(Object.values(accept))];
  const acceptable = Object.entries(accept).filter(([sq, label]) => (saved[stem]?.[sq] ?? base[sq]) !== label);

  async function confirmQueue() {
    // Anything hand-painted on this board wins over the filter's answer for the same square.
    const painted = new Set(pending.map((r) => r.square));
    const rows: Correction[] = [
      ...pending,
      ...acceptable
        .filter(([sq]) => !painted.has(sq))
        .map(([square, label]) => ({ session_id: sessionId, frame: stem, square, label })),
    ];
    setEdits((e) => ({ ...e, [stem]: { ...e[stem], ...accept } }));
    await flush(rows);
    setAt((i) => nextOpen(i + 1));
  }

  if (!frame) return <p className="text-muted-foreground text-sm">No proposal frames.</p>;

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="font-mono">
          frame {stem} · ply {frame.ply} · {at + 1}/{frames.length}
          {accepts ? ` · ${stillOpen} open` : ""}
          {queueNote ? ` · ${queueNote}` : ""}
        </span>
        <PhaseChip frame={frame} />
        <Button disabled={at === 0} onClick={() => void go(-1)} size="sm" variant="outline">
          previous
        </Button>
        <Button
          disabled={at + 1 >= frames.length}
          onClick={() => void go(1)}
          size="sm"
          variant="outline"
        >
          next
        </Button>
        <Button
          onClick={() => setEraser((e) => !e)}
          size="sm"
          variant={eraser ? "default" : "outline"}
        >
          {eraser ? "eraser ON" : `brush: ${brush}`}
        </Button>
        <span className="text-muted-foreground">
          drag paints · right button erases · click cycles · keys pick the brush ·{" "}
          <strong className="text-foreground">bright</strong> = you judged it, dim = FEN&apos;s word,
          nobody looked ({judged.size}/64 judged here)
        </span>
        <Legend />
        <Button
          className="ml-auto"
          disabled={pending.length === 0}
          onClick={() => void flush(pending)}
          size="sm"
        >
          write {pending.length} cells
        </Button>
      </div>

      {Object.keys(accept).length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-800 bg-sky-950/40 p-3 text-sm">
          <Button autoFocus={false} onClick={() => void confirmQueue()} size="sm">
            ✓ confirm {acceptCells.length} {acceptCells.length === 1 ? "cell" : "cells"}
            {acceptLabels.length === 1 ? ` as ${acceptLabels[0]}` : ""} → next board
          </Button>
          <span className="text-muted-foreground">
            <kbd className="text-foreground">Enter</kbd> does the same. Only the outlined cells are
            written — the other {64 - Object.keys(accept).length} keep the FEN&apos;s word and stay
            unjudged, because you did not look at them.
          </span>
          <Button className="ml-auto" onClick={() => void go(1)} size="sm" variant="outline">
            skip this board →
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {PALETTE.map(([key, label]) => (
          <Button
            key={label}
            onClick={(event) => {
              event.currentTarget.blur();
              setBrush(label);
              setEraser(false);
            }}
            size="sm"
            variant={brush === label && !eraser ? "default" : "outline"}
          >
            <span className="text-muted-foreground mr-1 font-mono">{key}</span>
            {label}
          </Button>
        ))}
      </div>

      <div
        className="relative mx-auto aspect-square w-full max-w-[720px] select-none"
        onContextMenu={(event) => event.preventDefault()}
        onPointerLeave={up}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || !painting.current) return;
          // Touch: a finger fires no pointerenter on the cells it slides over — derive the cell.
          const r = event.currentTarget.getBoundingClientRect();
          const col = Math.floor(((event.clientX - r.left) / r.width) * 8);
          const row = Math.floor(((event.clientY - r.top) / r.height) * 8);
          if (col >= 0 && col < 8 && row >= 0 && row < 8) enter(`${FILES[col]}${8 - row}`);
        }}
        onPointerUp={up}
        style={{ touchAction: "none" }}
      >
        <Image
          alt={`board ${stem}`}
          className="object-contain"
          fill
          sizes="720px"
          src={`/api/board/${name}/${stem}?size=720`}
          unoptimized
        />
        <div className="absolute inset-0 grid grid-cols-8">
          {SQUARES.map((sq) => {
            const label = labels[sq];
            const tint =
              label === "occluded"
                ? "bg-amber-500/45"
                : label !== fen[sq]
                  ? "bg-sky-500/40"
                  : "hover:bg-white/10";
            // What the filter flagged, before you touch anything — an outline, never a label:
            // the model asks the question, the brush answers it.
            const flagged = hits?.[stem]?.includes(sq)
              ? "outline outline-2 -outline-offset-2 outline-fuchsia-400"
              : "";
            const read = reads?.[stem]?.[sq];
            return (
              <div
                className={`relative border border-white/10 ${tint} ${flagged}`}
                key={sq}
                onPointerDown={(event) => {
                  painting.current = {
                    start: sq,
                    erase: eraser || event.button === 2,
                    dragged: false,
                  };
                }}
                onPointerEnter={() => enter(sq)}
              >
                {/* What will be WRITTEN, always — colour alone does not say `wP` from `bP`.
                    BRIGHT means a human decided it; DIM means the FEN says so and nobody has
                    looked. Painting occluded on one square says nothing about the other 63, and
                    the board must not imply otherwise. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-mono text-[10px] leading-tight">
                  <span
                    className={`bg-background/75 rounded px-0.5 ${
                      judged.has(sq) ? "font-bold text-white" : "text-white/45"
                    }`}
                  >
                    {labels[sq]}
                  </span>
                  {read ? (
                    <span className="block text-fuchsia-300">
                      <span className="bg-background/75 rounded px-0.5">{read}</span>
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * What the frame is a picture OF: the hand leaving the move that just landed, or the next move
 * arriving. A labeler asked for this because the two need different scepticism — after a commit
 * the FEN is true and only the occluders are in question, while before the next one the piece may
 * already sit on its destination with the FEN still describing the position it left.
 */
function PhaseChip({ frame }: { frame: FrameInfo }) {
  if (!frame.phase) return null;
  const after = frame.phase === "after";
  const seconds = after ? frame.sinceS : frame.toS;
  const gap = seconds === undefined || !Number.isFinite(seconds) ? "" : ` ${seconds.toFixed(1)} s`;
  const [tone, text, why] =
    frame.phase === "settled"
      ? ["bg-muted text-muted-foreground", "settled — no hand", "clear of both commits; the FEN is simply true"]
      : after
        ? [
            "bg-emerald-950 text-emerald-300",
            `${gap} after the move`,
            "the hand is leaving the move that just landed — the FEN is true here",
          ]
        : [
            "bg-amber-950 text-amber-300",
            `${gap} before the next move`,
            "the next move is arriving — a piece may already have moved while the FEN has not",
          ];
  return (
    <span className="flex items-center gap-2">
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`} title={why}>
        {text}
      </span>
      {frame.unknown?.length ? (
        <span className="text-muted-foreground text-xs" title="the exporter vouches for no label here">
          FEN unknown on {frame.unknown.join(" ")}
        </span>
      ) : null}
    </span>
  );
}


/**
 * What the four states on the board mean. It was asked ("was bedeutet das blaue Kästchen?",
 * 2026-08-09) because the header explained bright-vs-dim and said nothing about the colours —
 * a tint that needs a person to explain it is not a tint, it is a puzzle.
 */
function Legend() {
  const items: [string, string, string][] = [
    ["bg-amber-500/45", "occluded", "the cell is marked as covered"],
    ["bg-sky-500/40", "differs from FEN", "some other label than the game says here"],
    ["bg-transparent border border-white/25", "as the FEN says", "nothing was changed"],
    ["outline outline-2 -outline-offset-2 outline-fuchsia-400", "filter hit", "the cell your query found"],
  ];
  return (
    <span className="flex flex-wrap items-center gap-3 text-xs">
      {items.map(([swatch, label, why]) => (
        <span className="flex items-center gap-1" key={label} title={why}>
          <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} />
          <span className="text-muted-foreground">{label}</span>
        </span>
      ))}
    </span>
  );
}
