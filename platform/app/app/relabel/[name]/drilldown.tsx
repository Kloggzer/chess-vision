"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PhaseChip } from "@/components/phase-chip";
import { BoardLegend, BoardSurface, GLYPH, PALETTE, useBoardPaint } from "@/components/board-paint";
import type { Correction, Ledger } from "@/lib/corrections";
import { type BoardPlan, type Row, confirmLabel } from "@/lib/selection";
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
  /** The rows that landed, not their count: the session panel counts BOARDS and labels (§6.1). */
  onWritten: (rows: Correction[], ledger: Ledger) => void;
  onError: (error: unknown) => void;
  /** Squares the active filter hit on each frame — outlined, so the eye starts where the work is. */
  hits?: Record<string, string[]>;
  /** `{stem: {square: label}}` — what "yes, correct" writes per matched cell. The API decides it,
   *  because only the query knows what it asked (see the filter route). */
  accepts?: Record<string, Record<string, string>>;
  /** Where the queue came from, for the header line. */
  queueNote?: string;
};

/**
 * Every control thumb-sized: 44 px squares on phone, 28 px buttons failed (2026-08-13).
 */
const TOUCH = "max-sm:h-11 max-sm:px-3";

const GESTEN =
  "Ziehen malt · rechte Taste radiert · Klick blättert durch die Labels · Klick auf ein Flag nimmt es ab · " +
  "Tasten laden den Pinsel. Hell = du hast entschieden, dunkel = das Wort des FEN, niemand hat hingesehen.";

/**
 * One session's boards with brush (board-paint.tsx).
 * Queue state here; painting moved out for LABELN stream parity.
 */
export function Drilldown(props: DrilldownProps) {
  const { name, sessionId, frames, decided, onWritten, onError, hits, accepts, queueNote } = props;
  /**
   * Board worth stopping at: matched cell with no verdict.
   * Queue reopens at index 0 to avoid looking untouched (2026-08-09).
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

  const frame = frames[at];
  const stem = frame?.stem ?? "";
  const accept = useMemo(() => accepts?.[stem] ?? {}, [accepts, stem]);
  const paint = useBoardPaint({ boardKey: stem, fen: frame?.fen ?? "", decided, stem, accept });
  const { plan, judged, offable } = paint;

  const rows = useCallback(
    (list: Row[]): Correction[] => list.map((r) => ({ session_id: sessionId, frame: stem, ...r })),
    [sessionId, stem],
  );
  const pending = useMemo(() => rows(paint.paintRows), [paint.paintRows, rows]);

  const flush = useCallback(
    async (batch: Correction[]) => {
      if (batch.length === 0) return;
      try {
        await writeRows(batch);
        onWritten(batch, "corrections");
        paint.markSaved(batch);
      } catch (error) {
        onError(error);
      }
    },
    [onWritten, onError, paint],
  );

  // Writes on navigate-away, including leaving the view: an unmount cleanup cannot read state,
  // so the two moving parts are mirrored into refs from an effect (never during render).
  const latest = useRef<Correction[]>([]);
  const flushRef = useRef(flush);
  // Enter confirms the queue's answer, Backspace rejects it — mirrored for the same reason:
  // the key listener is subscribed once and must still call the CURRENT closure.
  const confirmRef = useRef<() => Promise<void>>(async () => {});
  const rejectRef = useRef<() => Promise<void>>(async () => {});
  const floodRef = useRef<() => void>(() => {});
  const brushRef = useRef(paint.setBrush);
  useEffect(() => {
    latest.current = pending;
    flushRef.current = flush;
    confirmRef.current = confirmQueue;
    rejectRef.current = rejectQueue;
    floodRef.current = paint.flood;
    brushRef.current = paint.setBrush;
  });
  useEffect(() => () => void flushRef.current(latest.current), []);

  // One key, one brush — the same letters the stream uses, so the two views are one habit.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        void confirmRef.current();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        void rejectRef.current();
        return;
      }
      if (event.key === "a") {
        event.preventDefault();
        floodRef.current();
        return;
      }
      const hit = PALETTE.find(([k]) => k === event.key);
      if (!hit) return;
      event.preventDefault();
      brushRef.current(hit[1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function go(delta: number) {
    await flush(pending);
    setAt((i) => Math.max(0, Math.min(frames.length - 1, i + delta)));
  }

  /** The next board still worth stopping at, or the last one if the queue is worked through. */
  const nextOpen = (from: number) => {
    for (let i = from; i < frames.length; i++) if (open(frames[i])) return i;
    return frames.length - 1;
  };

  /** So a half-worked queue does not look untouched — the count is the honest progress bar. */
  const stillOpen = accepts ? frames.filter(open).length : frames.length;
  const acceptCells = Object.keys(accept);

  /**
   * Write board state and advance — one path for both buttons.
   * Flag off → REVIEW ledger (looked at, FEN was right).
   */
  async function commit(what: BoardPlan) {
    const reviewed = what.rejected.map((square) => ({ square, label: paint.base[square] }));
    try {
      await flush(rows(what.corrections));
      if (reviewed.length > 0) {
        await writeRows(rows(reviewed), "reviewed");
        onWritten(rows(reviewed), "reviewed");
      }
      paint.markCommitted([...what.committed, ...reviewed]);
      setAt((i) => nextOpen(i + 1));
    } catch (error) {
      onError(error);
    }
  }

  /**
   * Confirm: "filter is right HERE" — selected cells only (2026-08-09).
   */
  async function confirmQueue() {
    await commit(plan);
  }

  /**
   * Reject: "not occluded — FEN is right" (2026-08-10).
   * Brush strokes still write corrections first.
   */
  async function rejectQueue() {
    await commit(paint.rejectAll());
  }

  if (!frame) return <p className="text-muted-foreground text-sm">Keine Vorschlags-Frames.</p>;

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="font-mono">
          frame {stem} · ply {frame.ply} · {at + 1}/{frames.length}
          {accepts ? ` · ${stillOpen} open` : ""}
          {queueNote ? ` · ${queueNote}` : ""}
        </span>
        <PhaseChip frame={frame} />
        <Button disabled={at === 0} onClick={() => void go(-1)} className={TOUCH} size="sm" variant="outline">
          ←
        </Button>
        <Button
          disabled={at + 1 >= frames.length}
          onClick={() => void go(1)}
          className={TOUCH}
          size="sm"
          variant="outline"
        >
          →
        </Button>
        <Button
          onClick={() => paint.setEraser(!paint.eraser)}
          className={TOUCH}
          size="sm"
          variant={paint.eraser ? "default" : "outline"}
        >
          {paint.eraser ? "Radierer AN" : `Pinsel: ${paint.brush}`}
        </Button>
        <Button
          onClick={(event) => {
            event.currentTarget.blur();
            paint.flood();
          }}
          className={TOUCH}
          size="sm"
          title="alles occluded, Radierer an — dann die sichtbaren Zellen freiradieren"
          variant="outline"
        >
          <span className="text-muted-foreground mr-1 font-mono">a</span>
          alles occluded
        </Button>
        <span className="text-muted-foreground tabular-nums" title={GESTEN}>
          {judged.size}/64 entschieden
        </span>
        <BoardLegend />
        <Button
          className={`ml-auto ${TOUCH}`}
          disabled={pending.length === 0}
          onClick={() => void flush(pending)}
          size="sm"
        >
          {pending.length} Zellen schreiben
        </Button>
      </div>

      {acceptCells.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-800 bg-sky-950/40 p-3 text-sm">
          <Button autoFocus={false} className={TOUCH} onClick={() => void confirmQueue()} size="sm">
            ✓ {confirmLabel(plan)}
          </Button>
          <Button onClick={() => void rejectQueue()} className={TOUCH} size="sm" variant="secondary">
            ✗ nichts verdeckt — FEN stimmt → nächstes Brett
          </Button>
          <Button
            onClick={(event) => {
              event.currentTarget.blur();
              paint.toggleFlags();
            }}
            className={TOUCH}
            size="sm"
            title={`⌫ nimmt jedes Flag ab (reviewed, keine Trainingszeile); ⏎ schreibt die ${plan.committed.length} gewählten. Ungeflaggte Zellen behalten das Wort des FEN und bleiben unbeurteilt.`}
            variant="outline"
          >
            {offable.length > 0 ? `alle ${offable.length} Flags ab` : "alle Flags an"}
          </Button>
          <Button className={`ml-auto ${TOUCH}`} onClick={() => void go(1)} size="sm" variant="outline">
            Brett überspringen →
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {PALETTE.map(([key, label]) => {
          const on = paint.brush === label && !paint.eraser;
          return (
            <button
              className={`w-11 cursor-pointer rounded border py-0.5 text-center font-mono text-xs max-sm:h-11 ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              key={label}
              onClick={(event) => {
                event.currentTarget.blur();
                paint.setBrush(label);
              }}
              title={label}
              type="button"
            >
              {key} <span className="text-sm">{GLYPH[label] ?? ""}</span>
            </button>
          );
        })}
      </div>

      <BoardSurface
        accept={accept}
        alt={`board ${stem}`}
        hits={hits?.[stem]}
        src={`/api/board/${name}/${stem}?size=720`}
        state={paint}
      />
    </div>
  );
}
