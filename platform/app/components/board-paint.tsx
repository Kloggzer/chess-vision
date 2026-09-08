"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { coveragePct, IDENTITY_CLASSES, LEGACY_LABEL } from "@/lib/classes";
import { FILES, fenLabels } from "@/lib/fen";
import { type BoardPlan, type Labels, type Row, cycleNext, planBoard, planRejectAll } from "@/lib/selection";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * Rectified board with 8x8 paint overlay and state machine.
 * Extracted so LABELN stream paints same board (CONCEPT.md 4.2).
 */
export const SQUARES = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`);

/**
 * Brush loads: digits=white FEN order, lowercase=black. `x` is not a piece; stream uses `e` for
 * empty (CONCEPT.md 4.2). Thirteen keys, no `o` — occlusion is measured, not painted.
 */
const PALETTE: [string, string][] = [
  ["x", "empty"],
  ["1", "wP"], ["2", "wN"], ["3", "wB"], ["4", "wR"], ["5", "wQ"], ["6", "wK"],
  ["p", "bP"], ["n", "bN"], ["b", "bB"], ["r", "bR"], ["q", "bQ"], ["k", "bK"],
];

/** The palette IS the writable class list — a key that writes something else is a bug. */
if (PALETTE.length !== IDENTITY_CLASSES.length) throw new Error("palette is not config.IDENTITY_CLASSES");

/** One glyph per class: the key button says WHAT it loads without widening the row. `occluded`
 *  has none to load and is here for the LEGACY rows the board still renders. */
export const GLYPH: Record<string, string> = {
  wP: "♙", wN: "♘", wB: "♗", wR: "♖", wQ: "♕", wK: "♔",
  bP: "♟", bN: "♞", bB: "♝", bR: "♜", bQ: "♛", bK: "♚",
  [LEGACY_LABEL]: "▨", empty: "·",
};

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
  prefilled?: Labels;
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
  suggested: Set<string>;
  /** Flags that can be taken off in bulk — one the FILE already answers is not one of them. */
  offable: string[];
  /** PAINT only: a flag must not leave through the navigate-away flush, only through a commit. */
  paintRows: Row[];
  rejectAll: () => BoardPlan;
  paint: (square: string, erase: boolean) => void;
  cycle: (square: string) => void;
  toggleFlags: () => void;
  /** In-memory pop — `z` before anything has left (CONCEPT.md 4.2.2, first regime). */
  undo: () => boolean;
  /** What already left through the writer, so the unsaved diff is measured against it. */
  markSaved: (rows: Row[]) => void;
  /** A committed board's answers, so the cells read as judged without a re-read of the ledger. */
  markCommitted: (rows: Row[]) => void;
};

export function useBoardPaint(input: PaintInput): PaintState {
  const { boardKey, fen: fenText, decided, stem, accept, prefilled = {} } = input;
  const [eraser, setEraser] = useState(false);
  const [brush, setBrushLabel] = useState("empty");
  /** Loading the brush disarms the eraser — otherwise picking `wP` still rubbed the FEN back on. */
  const setBrush = useCallback((label: string) => {
    setBrushLabel(label);
    setEraser(false);
  }, []);
  const [edits, setEdits] = useState<ByBoard>({});
  const [saved, setSaved] = useState<ByBoard>({});
  const [history, setHistory] = useState<Step[]>([]);
  const [claimed, setClaimed] = useState<Record<string, Set<string>>>({});

  const fen = useMemo(() => fenLabels(fenText), [fenText]);
  const base = useMemo(() => {
    const out: Labels = {};
    for (const sq of SQUARES) out[sq] = decided[`${stem}|${sq}`] ?? fen[sq];
    return out;
  }, [decided, fen, stem]);

  const inherited = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(prefilled).filter(([square]) => !claimed[boardKey]?.has(square)),
      ),
    [boardKey, claimed, prefilled],
  );

  const painted = useMemo(() => edits[boardKey] ?? {}, [boardKey, edits]);
  const onFile = useMemo(() => ({ ...base, ...saved[boardKey] }), [base, saved, boardKey]);
  const plan = useMemo(
    () =>
      planBoard({
        squares: SQUARES,
        proposals: accept,
        painted,
        prefilled: inherited,
        base,
        onFile,
      }),
    [accept, base, inherited, painted, onFile],
  );
  const kept = useMemo(() => new Set(plan.selected), [plan]);
  const suggested = useMemo(
    () => new Set(Object.keys(inherited).filter((square) => painted[square] === undefined)),
    [inherited, painted],
  );
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
      setClaimed((current) => {
        const here = new Set(current[boardKey] ?? []);
        here.add(square);
        return { ...current, [boardKey]: here };
      });
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
    fen, base, plan, labels: plan.labels, kept, judged, suggested, offable,
    paintRows: plan.paintRows,
    rejectAll, paint, cycle, toggleFlags, undo, markSaved, markCommitted,
  };
}

export type BoardSurfaceProps = {
  /** `/api/board/<name>/<stem>?size=720`. */
  src: string;
  alt: string;
  /** Absent = look, do not paint: the matte review asks about the alpha, not about labels. */
  state?: PaintState;
  accept: Labels;
  /** Squares the active lane hit — outlined, so the eye starts where the work is. */
  hits?: string[];
  /** `matte.jsonl`'s measured fraction per square, printed per cell — the alpha draws the shape. */
  coverage?: Record<string, number>;
  /** Drawn between the board and the paint grid — the matte review puts its alpha here. */
  overlay?: React.ReactNode;
  /** Drawn ABOVE the grid — the matte review's pen, which has to swallow the grid's own clicks. */
  tool?: React.ReactNode;
  /** No label chip on `empty` squares; the coverage number stays (User, 2026-08-19). */
  hideEmpty?: boolean;
  /** The square under the pointer: `Space` acts on it, so no cell cursor is needed (REVIEW S3). */
  onHover?: (square: string | null) => void;
};

/**
 * An occluder covers a CONTIGUOUS swath, so the primary gesture is a BRUSH: pointer-down and drag
 * marks every cell the pointer enters, the eraser (or the right button) puts the FEN label back.
 * A click without a drag cycles. Pointer bookkeeping over plain divs — no canvas.
 */
export function BoardSurface({ src, alt, state, accept, hits, coverage, overlay, tool, hideEmpty, onHover }: BoardSurfaceProps) {
  const painting = useRef<{ start: string; erase: boolean; dragged: boolean } | null>(null);
  const flagged = useMemo(() => new Set(hits ?? []), [hits]);

  function enter(square: string) {
    onHover?.(square);
    const at = painting.current;
    if (!at || !state) return;
    if (!at.dragged) {
      if (at.start === square) return; // still inside the cell the press started in
      at.dragged = true;
      state.paint(at.start, at.erase);
    }
    state.paint(square, at.erase);
  }

  function up() {
    const at = painting.current;
    painting.current = null;
    if (at && !at.dragged) state?.cycle(at.start);
  }

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[min(720px,calc(100dvh-17rem))] select-none"
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
      {overlay}
      <div className="absolute inset-0 grid grid-cols-8">
        {SQUARES.map((sq) => {
          const label = state?.labels[sq];
          // What the lane flagged, before you touch anything — an outline, never a label: the
          // model asks the question, the brush answers it. 4 px and a fill on untouched cells,
          // because 2 px next to the cell borders was invisible ("ich sehe nicht was da markiert
          // ist", 2026-08-10). A flag ON is solid, one taken off keeps a dashed ghost.
          const isFlagged = flagged.has(sq) || accept[sq] !== undefined;
          const on = state !== undefined && state.kept.has(sq);
          const outline = !isFlagged
            ? ""
            : on
              ? "outline outline-4 -outline-offset-4 outline-fuchsia-500"
              : "outline outline-2 -outline-offset-2 outline-dashed outline-white/40";
          const cov = coverage?.[sq];
          const chip = label === undefined || (hideEmpty && label === "empty") ? null : label === LEGACY_LABEL ? "▨ alt" : label;
          // Nothing tints a covered cell: the alpha overlay says it in its real shape and can be
          // toggled off, while a solid square hid the very pixels the human came to judge ("ich
          // kann nicht gut gucken", 2026-08-19). The measured number stays — the alpha has none.
          const tint = !state
            ? ""
            : label === LEGACY_LABEL
              ? "bg-amber-500/20"
              : label !== state.fen[sq]
                ? "bg-sky-500/40"
                : on
                  ? "bg-fuchsia-500/15"
                  : "hover:bg-white/10";
          return (
            // No per-cell tooltip: it pops up under the brush on every cell the drag enters. The
            // model's word lives in the lane's hover line instead (`board-lane.tsx`), where it
            // does not follow the pointer.
            <div
              className={`relative border border-white/10 ${tint} ${outline}`}
              key={sq}
              onPointerDown={
                state &&
                ((event) => {
                  painting.current = { start: sq, erase: state.eraser || event.button === 2, dragged: false };
                })
              }
              onPointerEnter={() => enter(sq)}
            >
              {cov === undefined || coveragePct(cov) === null ? null : (
                <span className="bg-background/70 pointer-events-none absolute top-0 right-0 rounded-bl px-0.5 font-mono text-[9px] leading-tight tabular-nums text-amber-200">
                  {coveragePct(cov)}
                </span>
              )}
              {/* What will be WRITTEN, always — colour alone does not say `wP` from `bP`. BRIGHT
                  means a human decided it; DIM means the FEN says so and nobody has looked. */}
              {chip === null ? null : (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 select-none text-center font-mono text-[10px] leading-tight">
                  <span
                    className={`bg-background/75 rounded px-0.5 ${
                      state?.judged.has(sq)
                        ? "font-bold text-white"
                        : state?.suggested.has(sq)
                          ? "font-bold text-cyan-200"
                          : on
                            ? "font-bold text-fuchsia-200"
                            : "text-white/45"
                    }`}
                  >
                    {chip}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {tool}
    </div>
  );
}

/**
 * What the states on the board mean, as swatches — asked once ("was bedeutet das blaue Kästchen?",
 * 2026-08-09), so the words live in the tooltip and the colour carries the row.
 */
export function BoardLegend({ showPrefilled = false }: { showPrefilled?: boolean }) {
  const items: [string, string][] = [
    ["bg-amber-500/20", "▨ alt — eine Altzeile aus der Zeit, als occluded von Hand gemalt wurde"],
    ["bg-sky-500/40", "≠ FEN — hier steht ein anderes Label als die Partie sagt"],
    ["bg-transparent border border-white/25", "wie im FEN — nichts geändert"],
    ["outline outline-2 -outline-offset-2 outline-fuchsia-400", "Flag an — commit schreibt diese Zelle"],
    ["outline outline-2 -outline-offset-2 outline-dashed outline-white/40", "Flag aus — geprüft, keine Trainingszeile"],
  ];
  if (showPrefilled) {
    items.push([
      "outline outline-2 -outline-offset-2 outline-dashed outline-cyan-300",
      "Vorschlag — aus einem bestätigten Frame desselben Ply vorgefüllt",
    ]);
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {items.map(([swatch, why]) => (
        <Tooltip key={why}>
          <TooltipTrigger asChild>
            <span aria-label={why} className={`inline-block h-3 w-3 rounded-sm ${swatch}`} role="img" />
          </TooltipTrigger>
          <TooltipContent>{why}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
}
