"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BoardLegend, BoardSurface, useBoardPaint } from "@/components/board-paint";
import { PaletteRow } from "@/components/palette-row";
import { PhaseChip } from "@/components/phase-chip";
import type { Correction } from "@/lib/session-store/corrections";
import type { StreamBoard } from "@/lib/label/label-stream";
import { confirmLabel, type BoardPlan } from "@/lib/label/selection";
import type { Flush, LaneActions } from "./stream";

const TOUCH = "max-sm:h-11 max-sm:px-3";

export type BoardLaneProps = {
  name: string;
  sessionId: string;
  board: StreamBoard;
  accept: Record<string, string>;
  reads: Record<string, string>;
  decided: Record<string, string>;
  /** `{square: coverage}` of this frame, when an alpha was cut for it. */
  coverage?: Record<string, number>;
  actionsRef: RefObject<LaneActions>;
  onFlush: Flush;
  onStep: (delta: number) => void;
  onNext: (ply?: number) => void;
};

/**
 * One board of the stream, painted with the brush of `components/board-paint.tsx`.
 *
 * `Space` acts on the square under the POINTER: picking three arbitrary cells out of 64 is a 2-D
 * pointing task the mouse wins, and arrow-walking a cursor there would cost ~4 presses each
 * (REVIEW S3). The arrows step BOARDS instead.
 */
export function BoardLane(props: BoardLaneProps) {
  const { name, sessionId, board, accept, reads, decided, coverage, actionsRef, onFlush, onStep, onNext } = props;
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
    // `markCommitted` leert die Mal-Historie: ohne diese Pruefung war das Gemalte nach einem
    // gescheiterten POST weg, und `onNext` blaetterte auf das naechste Brett weiter.
    if (!(await onFlush(
      board.pos,
      [
        { rows: rows(what.corrections), ledger: "corrections" },
        { rows: rows(reviewed), ledger: "reviewed" },
      ],
      prior,
    ))) return;
    paint.markCommitted([...what.committed, ...reviewed]);
    onNext(ply);
  };

  // The one keymap lives in the stream; this publishes what the board can answer with.
  const current = useRef({ commit, paint, hover, board, onStep, onNext });
  useEffect(() => {
    current.current = { commit, paint, hover, board, onStep, onNext };
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
        <PaletteRow active={paint.eraser ? undefined : paint.brush} onPick={paint.setBrush} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`ml-1 cursor-pointer rounded border px-2 py-0.5 text-xs max-sm:h-11 ${
                paint.eraser ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => paint.setEraser(!paint.eraser)}
              type="button"
            >
              Radierer
            </button>
          </TooltipTrigger>
          <TooltipContent>setzt gestrichene Zellen auf das Wort des FEN zurück</TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground ml-auto text-xs">
          Pinsel <span className="text-foreground font-mono">{paint.eraser ? "Radierer" : paint.brush}</span>
        </span>
      </div>

      <BoardSurface
        accept={accept}
        alt={`board ${board.stem}`}
        coverage={coverage}
        hits={acceptCells}
        onHover={setHover}
        src={`/api/board/${name}/${board.stem}?size=720`}
        state={paint}
      />

      <div className="text-muted-foreground flex h-5 flex-wrap items-center gap-x-3 text-xs">
        <span className="font-mono">
          {hover ? `${hover} · ${paint.labels[hover]}${reads[hover] ? ` · Modell ${reads[hover]}` : ""}` : ""}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="tabular-nums">{judged.size}/64 entschieden</span>
            </TooltipTrigger>
            <TooltipContent>hell = entschieden, dunkel = das Wort des FEN</TooltipContent>
          </Tooltip>
          <BoardLegend />
        </span>
      </div>
    </div>
  );
}
