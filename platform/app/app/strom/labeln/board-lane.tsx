"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { BoardLegend, BoardSurface, STREAM_PALETTE, useBoardPaint } from "@/components/board-paint";
import { PhaseChip } from "@/app/relabel/[name]/drilldown";
import type { Correction } from "@/lib/corrections";
import type { StreamBoard } from "@/lib/label-stream";
import { confirmLabel, type BoardPlan } from "@/lib/selection";
import type { Flush, LaneActions } from "./stream";

const TOUCH = "max-sm:h-11 max-sm:px-3";

export type BoardLaneProps = {
  name: string;
  sessionId: string;
  board: StreamBoard;
  accept: Record<string, string>;
  reads: Record<string, string>;
  decided: Record<string, string>;
  actionsRef: RefObject<LaneActions>;
  onFlush: Flush;
  onStep: (delta: number) => void;
  onNext: (ply?: number) => void;
  onGrid: (square: string) => void;
};

/**
 * One board of the stream, painted with the brush of `components/board-paint.tsx`.
 *
 * `Space` acts on the square under the POINTER: picking three arbitrary cells out of 64 is a 2-D
 * pointing task the mouse wins, and arrow-walking a cursor there would cost ~4 presses each
 * (REVIEW S3). The arrows step BOARDS instead.
 */
export function BoardLane(props: BoardLaneProps) {
  const { name, sessionId, board, accept, reads, decided, actionsRef, onFlush, onStep, onNext, onGrid } = props;
  const boardKey = `${board.session}:${board.stem}`;
  const paint = useBoardPaint({ boardKey, fen: board.fen, decided, stem: board.stem, accept });
  const [hover, setHover] = useState<string | null>(null);
  const { plan, judged, offable } = paint;

  const rows = (list: { square: string; label: string }[]): Correction[] =>
    list.map((r) => ({ session_id: sessionId, frame: board.stem, ...r }));

  /**
   * Write what the board says, then move on. Corrections are the training rows; a flag taken off
   * has nothing to correct and goes to the review ledger as provenance.
   */
  const commit = async (what: BoardPlan, ply?: number) => {
    const reviewed = what.rejected.map((square) => ({ square, label: paint.base[square] }));
    const prior = Object.fromEntries(
      [...what.corrections, ...reviewed].map((r) => [
        `${sessionId}|${board.stem}|${r.square}`,
        decided[`${board.stem}|${r.square}`],
      ]),
    );
    await onFlush(
      board.pos,
      [
        { rows: rows(what.corrections), ledger: "corrections" },
        { rows: rows(reviewed), ledger: "reviewed" },
      ],
      prior,
    );
    paint.markCommitted([...what.committed, ...reviewed]);
    onNext(ply);
  };

  // The one keymap lives in the stream; this publishes what the board can answer with.
  const current = useRef({ commit, paint, hover, board, onStep, onGrid, onNext });
  useEffect(() => {
    current.current = { commit, paint, hover, board, onStep, onGrid, onNext };
  });
  useEffect(() => {
    actionsRef.current = {
      commit: () => void current.current.commit(current.current.paint.plan),
      reject: () => void current.current.commit(current.current.paint.rejectAll()),
      nextPly: () => void current.current.commit(current.current.paint.plan, current.current.board.ply),
      flagsOff: () => current.current.paint.toggleFlags(),
      toggleAt: () => {
        const square = current.current.hover;
        if (square) current.current.paint.cycle(square);
      },
      gridAt: () => {
        const square = current.current.hover;
        if (square) current.current.onGrid(square);
      },
      flood: () => current.current.paint.flood(),
      step: (delta) => current.current.onStep(delta),
      brush: (label) => current.current.paint.setBrush(label),
      undo: () => current.current.paint.undo(),
    };
  }, [actionsRef]);

  const acceptCells = useMemo(() => Object.keys(accept), [accept]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button className={TOUCH} onClick={() => void commit(plan)} size="sm">
          ⏎ {confirmLabel(plan)}
        </Button>
        <Button className={TOUCH} onClick={() => void commit(paint.rejectAll())} size="sm" variant="secondary">
          ⌫ FEN stimmt → nächstes
        </Button>
        {acceptCells.length > 0 ? (
          <Button
            className={TOUCH}
            onClick={(event) => {
              event.currentTarget.blur();
              paint.toggleFlags();
            }}
            size="sm"
            variant="outline"
          >
            <span className="text-muted-foreground mr-1 font-mono">f</span>
            {offable.length > 0 ? `alle ${offable.length} Flags ab` : "alle Flags an"}
          </Button>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          <PhaseChip frame={board} />
          <Button className={TOUCH} onClick={() => onStep(-1)} size="sm" variant="outline">
            ←
          </Button>
          <Button className={TOUCH} onClick={() => onStep(1)} size="sm" variant="outline">
            →
          </Button>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {STREAM_PALETTE.map(([key, label]) => (
          <Button
            className={TOUCH}
            key={label}
            onClick={(event) => {
              event.currentTarget.blur();
              paint.setBrush(label);
            }}
            size="sm"
            variant={paint.brush === label && !paint.eraser ? "default" : "outline"}
          >
            <span className="text-muted-foreground mr-1 font-mono">{key}</span>
            {label}
          </Button>
        ))}
        <Button
          className={TOUCH}
          onClick={() => paint.setEraser(!paint.eraser)}
          size="sm"
          variant={paint.eraser ? "default" : "outline"}
        >
          Radierer
        </Button>
      </div>

      <BoardSurface
        accept={accept}
        alt={`board ${board.stem}`}
        hits={acceptCells}
        onHover={setHover}
        reads={reads}
        src={`/api/board/${name}/${board.stem}?size=720`}
        state={paint}
      />

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          <strong className="text-foreground">hell</strong> = entschieden · dunkel = FEN ({judged.size}/64)
        </span>
        <BoardLegend />
      </div>
    </div>
  );
}
