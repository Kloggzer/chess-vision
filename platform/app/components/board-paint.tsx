"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { FILES, fenLabels } from "@/lib/fen";
import { type BoardPlan, type Labels, type Row, cycleNext, planBoard, planRejectAll } from "@/lib/selection";

/**
 * Rectified board with 8x8 paint overlay and state machine.
 * Extracted so LABELN stream paints same board (CONCEPT.md 4.2).
 */
export const SQUARES = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`);

/**
 * Brush loads: digits=white FEN order, lowercase=black.
 * `o`/`x` are not pieces; stream uses `e` for empty (CONCEPT.md 4.2).
 */
export const PALETTE: [string, string][] = [
  ["o", "occluded"], ["x", "empty"],
  ["1", "wP"], ["2", "wN"], ["3", "wB"], ["4", "wR"], ["5", "wQ"], ["6", "wK"],
  ["p", "bP"], ["n", "bN"], ["b", "bB"], ["r", "bR"], ["q", "bQ"], ["k", "bK"],
];

/** The same palette with `e` for empty — the stream spends `x` on "dieses Brett ist Müll". */
export const STREAM_PALETTE: [string, string][] = PALETTE.map(([key, label]) =>
  key === "x" ? (["e", label] as [string, string]) : [key, label],
);

/** `{boardKey: {square: label}}` — per board, so stepping to the next one resets nothing. */
type ByBoard = Record<string, Labels>;
/** One undone step: the square and what it held before, so `z` is an exact restore. */
type Step = { board: string; square: string; before?: string };

export type PaintInput = {
  /** Identity of the board across steps — the stream keys by session and stem, the drilldown by stem. */
  boardKey: string;
  fen: string;
  /** `stem|square -> label` of both ledgers, for this session. */
  decided: Record<string, string>;
  stem: string;
  /** `{square: label}` the lane flagged here — pre-selected, individually answerable. */
  accept: Labels;
};

export type PaintState = {
  brush: string;
  eraser: boolean;
  setBrush: (label: string) => void;
  setEraser: (on: boolean) => void;
  fen: Labels;
  base: Labels;
  plan: BoardPlan;
  labels: Labels;
  kept: Set<string>;
  judged: Set<string>;
  /** Flags that can be taken off in bulk — one the FILE already answers is not one of them. */
  offable: string[];
  /** PAINT only: a flag must not leave through the navigate-away flush, only through a commit. */
  paintRows: Row[];
  rejectAll: () => BoardPlan;
  paint: (square: string, erase: boolean) => void;
  cycle: (square: string) => void;
  flood: () => void;
  toggleFlags: () => void;
  /** In-memory pop — `z` before anything has left (CONCEPT.md 4.2.2, first regime). */
  undo: () => boolean;
  /** What already left through the writer, so the unsaved diff is measured against it. */
  markSaved: (rows: Row[]) => void;
  /** A committed board's answers, so the cells read as judged without a re-read of the ledger. */
  markCommitted: (rows: Row[]) => void;
};

export function useBoardPaint(input: PaintInput): PaintState {
  const { boardKey, fen: fenText, decided, stem, accept } = input;
  const [eraser, setEraser] = useState(false);
  const [brush, setBrushLabel] = useState("occluded");
  /** Loading the brush disarms the eraser — otherwise picking `wP` still rubbed the FEN back on. */
  const setBrush = useCallback((label: string) => {
    setBrushLabel(label);
    setEraser(false);
  }, []);
  const [edits, setEdits] = useState<ByBoard>({});
  const [saved, setSaved] = useState<ByBoard>({});
  const [history, setHistory] = useState<Step[]>([]);

  const fen = useMemo(() => fenLabels(fenText), [fenText]);
  const base = useMemo(() => {
    const out: Labels = {};
    for (const sq of SQUARES) out[sq] = decided[`${stem}|${sq}`] ?? fen[sq];
    return out;
  }, [decided, fen, stem]);

  const painted = useMemo(() => edits[boardKey] ?? {}, [boardKey, edits]);
  const onFile = useMemo(() => ({ ...base, ...saved[boardKey] }), [base, saved, boardKey]);
  const plan = useMemo(
    () => planBoard({ squares: SQUARES, proposals: accept, painted, base, onFile }),
    [accept, base, painted, onFile],
  );
  const kept = useMemo(() => new Set(plan.selected), [plan]);
  /**
   * Squares a HUMAN has ruled on. Everything else carries the FEN's word, which is a good label
   * and NOT a verdict: "I painted occluded on e5" says nothing about the pawn on d4 except that
   * nobody looked.
   */
  const judged = useMemo(
    () => new Set(SQUARES.filter((sq) => decided[`${stem}|${sq}`] !== undefined || painted[sq] !== undefined)),
    [decided, painted, stem],
  );

  const set = useCallback(
    (square: string, label: string) => {
      setHistory((h) => [...h, { board: boardKey, square, before: edits[boardKey]?.[square] }]);
      setEdits((e) => ({ ...e, [boardKey]: { ...e[boardKey], [square]: label } }));
    },
    [boardKey, edits],
  );

  const paint = useCallback(
    (square: string, erase: boolean) => set(square, erase ? fen[square] : brush),
    [brush, fen, set],
  );

  /** One click, one step — the order and its why live in `lib/selection.ts`. */
  const cycle = useCallback(
    (square: string) =>
      set(square, cycleNext({ current: plan.labels[square], proposal: accept[square], base: base[square], fen: fen[square], brush })),
    [accept, base, brush, fen, plan, set],
  );

  /**
   * The inverted gesture ("alle außer die sind nicht occluded", 2026-08-10): on a board mostly
   * under a hand the few CLEAN cells are the work. Flood, arm the eraser, free what is visible —
   * erased cells return to the FEN's word and write nothing.
   */
  const flood = useCallback(() => {
    setHistory((h) => [...h, ...SQUARES.map((sq) => ({ board: boardKey, square: sq, before: edits[boardKey]?.[sq] }))]);
    setEdits((e) => ({ ...e, [boardKey]: Object.fromEntries(SQUARES.map((sq) => [sq, "occluded"])) }));
    setEraser(true);
  }, [boardKey, edits]);

  /**
   * Bulk toggle flags: all off, click back the real ones (CONCEPT.md 4.2.1).
   * File-answered flags not bulk offable; that would supersede human correction.
   */
  const offable = plan.selected.filter((sq) => base[sq] !== accept[sq]);
  const toggleFlags = useCallback(() => {
    const squares = offable.length > 0 ? offable : plan.rejected;
    setHistory((h) => [...h, ...squares.map((sq) => ({ board: boardKey, square: sq, before: edits[boardKey]?.[sq] }))]);
    setEdits((e) => {
      const cell = { ...e[boardKey] };
      if (offable.length > 0) for (const sq of offable) cell[sq] = base[sq];
      else for (const sq of plan.rejected) delete cell[sq];
      return { ...e, [boardKey]: cell };
    });
  }, [base, boardKey, edits, offable, plan.rejected]);

  const undo = useCallback(() => {
    const step = history[history.length - 1];
    if (!step) return false;
    setHistory((h) => h.slice(0, -1));
    setEdits((e) => {
      const cell = { ...e[step.board] };
      if (step.before === undefined) delete cell[step.square];
      else cell[step.square] = step.before;
      return { ...e, [step.board]: cell };
    });
    return true;
  }, [history]);

  const markSaved = useCallback(
    (rows: Row[]) => {
      if (rows.length === 0) return;
      const written = Object.fromEntries(rows.map((r) => [r.square, r.label]));
      setSaved((s) => ({ ...s, [boardKey]: { ...s[boardKey], ...written } }));
    },
    [boardKey],
  );

  const markCommitted = useCallback(
    (rows: Row[]) => {
      if (rows.length === 0) return;
      setEdits((e) => ({
        ...e,
        [boardKey]: { ...e[boardKey], ...Object.fromEntries(rows.map((r) => [r.square, r.label])) },
      }));
      setHistory([]);
    },
    [boardKey],
  );

  const rejectAll = useCallback(
    () => planRejectAll({ squares: SQUARES, proposals: accept, painted, base, onFile }),
    [accept, base, onFile, painted],
  );

  return {
    brush, eraser, setBrush, setEraser,
    fen, base, plan, labels: plan.labels, kept, judged, offable,
    paintRows: plan.paintRows,
    rejectAll, paint, cycle, flood, toggleFlags, undo, markSaved, markCommitted,
  };
}

export type BoardSurfaceProps = {
  /** `/api/board/<name>/<stem>?size=720`. */
  src: string;
  alt: string;
  state: PaintState;
  accept: Labels;
  /** Squares the active lane hit — outlined, so the eye starts where the work is. */
  hits?: string[];
  /** `{square: "wP 0.87"}` — what the model reads there, printed in the cell. */
  reads?: Record<string, string>;
  /** The square under the pointer: `Space` acts on it, so no cell cursor is needed (REVIEW S3). */
  onHover?: (square: string | null) => void;
};

/**
 * An occluder covers a CONTIGUOUS swath, so the primary gesture is a BRUSH: pointer-down and drag
 * marks every cell the pointer enters, the eraser (or the right button) puts the FEN label back.
 * A click without a drag cycles. Pointer bookkeeping over plain divs — no canvas.
 */
export function BoardSurface({ src, alt, state, accept, hits, reads, onHover }: BoardSurfaceProps) {
  const { labels, fen, kept, judged, paint, cycle, eraser } = state;
  const painting = useRef<{ start: string; erase: boolean; dragged: boolean } | null>(null);
  const flagged = useMemo(() => new Set(hits ?? []), [hits]);

  function enter(square: string) {
    onHover?.(square);
    const at = painting.current;
    if (!at) return;
    if (!at.dragged) {
      if (at.start === square) return; // still inside the cell the press started in
      at.dragged = true;
      paint(at.start, at.erase);
    }
    paint(square, at.erase);
  }

  function up() {
    const at = painting.current;
    painting.current = null;
    if (at && !at.dragged) cycle(at.start);
  }

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[720px] select-none"
      onContextMenu={(event) => event.preventDefault()}
      onPointerLeave={() => {
        onHover?.(null);
        up();
      }}
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
      <Image alt={alt} className="object-contain" fill sizes="720px" src={src} unoptimized />
      <div className="absolute inset-0 grid grid-cols-8">
        {SQUARES.map((sq) => {
          const label = labels[sq];
          // What the lane flagged, before you touch anything — an outline, never a label: the
          // model asks the question, the brush answers it. 4 px and a fill on untouched cells,
          // because 2 px next to the cell borders was invisible ("ich sehe nicht was da markiert
          // ist", 2026-08-10). A flag ON is solid, one taken off keeps a dashed ghost.
          const isFlagged = flagged.has(sq) || accept[sq] !== undefined;
          const on = kept.has(sq);
          const outline = !isFlagged
            ? ""
            : on
              ? "outline outline-4 -outline-offset-4 outline-fuchsia-500"
              : "outline outline-2 -outline-offset-2 outline-dashed outline-white/40";
          const tint =
            label === "occluded"
              ? "bg-amber-500/45"
              : label !== fen[sq]
                ? "bg-sky-500/40"
                : on
                  ? "bg-fuchsia-500/15"
                  : "hover:bg-white/10";
          const read = reads?.[sq];
          return (
            <div
              className={`relative border border-white/10 ${tint} ${outline}`}
              key={sq}
              onPointerDown={(event) => {
                painting.current = { start: sq, erase: eraser || event.button === 2, dragged: false };
              }}
              onPointerEnter={() => enter(sq)}
            >
              {/* What will be WRITTEN, always — colour alone does not say `wP` from `bP`. BRIGHT
                  means a human decided it; DIM means the FEN says so and nobody has looked. */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-mono text-[10px] leading-tight">
                <span
                  className={`bg-background/75 rounded px-0.5 ${
                    judged.has(sq) ? "font-bold text-white" : on ? "font-bold text-fuchsia-200" : "text-white/45"
                  }`}
                >
                  {label}
                </span>
                {read ? (
                  // Struck through once the flag is off: the reading is what RAISED the cell, and
                  // a rejected reading must not keep shouting.
                  <span className={`block ${on || accept[sq] === undefined ? "text-fuchsia-300" : "text-white/35 line-through"}`}>
                    <span className="bg-background/75 rounded px-0.5">{read}</span>
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * What the states on the board mean. It was asked ("was bedeutet das blaue Kästchen?",
 * 2026-08-09) because the header explained bright-vs-dim and said nothing about the colours.
 */
export function BoardLegend() {
  const items: [string, string, string][] = [
    ["bg-amber-500/45", "occluded", "die Zelle ist als verdeckt markiert"],
    ["bg-sky-500/40", "≠ FEN", "hier steht ein anderes Label als die Partie sagt"],
    ["bg-transparent border border-white/25", "wie im FEN", "nichts geändert"],
    ["outline outline-2 -outline-offset-2 outline-fuchsia-400", "Flag an", "commit schreibt diese Zelle"],
    [
      "outline outline-2 -outline-offset-2 outline-dashed outline-white/40",
      "Flag aus",
      "abgewählt — geprüft, keine Trainingszeile",
    ],
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
