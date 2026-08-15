/**
 * The lanes of the LABELN stream (CONCEPT.md 4.2) — pure, so the stream's client half can import
 * it (`lib/client-boundary.test.ts`).
 *
 * A lane is a FILTER over one stream, never a page: it declares its renderer, its unit and its own
 * denominator. Mixing the units is the defect D1 diagnoses, so a chip never prints a bare number,
 * and a lane the producer has not filled yet prints `—` with its reason — `0` would claim there is
 * no such work when the truth is that nobody has been asked.
 */

import { fenLabels } from "@/lib/fen";
import type { LabelStream, StreamBoard } from "@/lib/label-stream";

export type LaneId =
  | "hands"
  | "unsure"
  | "disagree"
  | "classwall"
  | "unknown"
  | "control"
  | "audit"
  | "all";

/** A board lane paints the 8x8; a cell lane renders the crop grid, grouped by square (REVIEW S10). */
export type LaneRenderer = "board" | "cells";
export type LaneUnit = "Bretter" | "Zellen";

export type Lane = {
  id: LaneId;
  label: string;
  renderer: LaneRenderer;
  unit: LaneUnit;
  /** What the count is measured against, printed next to the chip — never assumed to be 3 976. */
  denominator: string;
};

export const LANES: readonly Lane[] = [
  { id: "hands", label: "Hände", renderer: "board", unit: "Bretter", denominator: "Bretter mit Vorschlägen" },
  { id: "unsure", label: "Unsicher", renderer: "cells", unit: "Zellen", denominator: "Zellen im Mittelband lo…hi" },
  { id: "disagree", label: "Modell ≠ FEN", renderer: "board", unit: "Bretter", denominator: "Bretter mit Vorschlägen" },
  { id: "classwall", label: "Klassenwand", renderer: "cells", unit: "Zellen", denominator: "Zellen mit Modell-Lesart" },
  {
    id: "unknown",
    label: "FEN unklar",
    renderer: "board",
    unit: "Bretter",
    // Its own corpus on purpose: `occluded.py` emits no proposal row for an unknown cell, so these
    // boards are partly outside the 3 976 and cannot carry an `n/3976` position (CONCEPT.md 4.2).
    denominator: "Bretter mit unknown_squares über die exportierten Sessions",
  },
  { id: "control", label: "Stichprobe", renderer: "cells", unit: "Zellen", denominator: "Kontroll-Stichprobe" },
  { id: "audit", label: "Audit", renderer: "cells", unit: "Zellen", denominator: "geflaggte Zellen des k-fold-Audits" },
  { id: "all", label: "Alle Bretter", renderer: "board", unit: "Bretter", denominator: "Bretter mit Vorschlägen" },
];

export const laneById = (id: LaneId): Lane => LANES.find((l) => l.id === id)!;

/** Why a lane is empty, when it is empty because nobody produced its input yet. */
export const NO_PROBS =
  "keine Modell-Lesarten auf der Platte — propose-occluded lief ohne --model. " +
  "Das heißt „noch nicht gefragt“, nicht „nichts gefunden“ (CONCEPT.md D2).";
export const NO_AUDIT =
  "data/manifests/audit-flags.jsonl fehlt — der Zwei-Hälften-Kreuztest lief noch nicht.";

export type LaneCount =
  /** `null` = the producer owes this lane its input; the reason is printed, never a `0`. */
  { n: number | null; why?: string };

/** The chip's two strings: the unit always travels with the number, `—` never as `0`. */
export function laneChip(lane: Lane, count: LaneCount): { text: string; title: string } {
  const text = count.n === null ? `${lane.label} —` : `${lane.label} ${count.n} ${lane.unit}`;
  const title = count.n === null ? (count.why ?? "kein Input auf der Platte") : `${count.n} ${lane.unit} · ${lane.denominator}`;
  return { text, title };
}

/**
 * Where a lane switch lands: the first item at or after the position you were on.
 *
 * "Switching a lane keeps you in place" (CONCEPT.md 4.2) — every item carries the same ordinal, so
 * a switch is a search in that order, never a reset to the top; past the end the last item is the
 * honest answer. By VALUE, because a cell lane is grouped by square and its ordinals do not ascend.
 */
export function keepPosition(positions: readonly number[], at: number): number {
  if (positions.length === 0) return 0;
  const ahead = positions.filter((p) => p >= at);
  return positions.indexOf(ahead.length > 0 ? Math.min(...ahead) : Math.max(...positions));
}

/**
 * Cells of one lane, grouped BY SQUARE inside a session (`bucket.tsx:66-72`, REVIEW S10) while the
 * sessions stay sequential. Score order scattered a square's six crops over six pages ("ich sehe
 * immer noch alte Bilder", 2026-08-09); the stream's session order is the outer key.
 */
export function groupBySquare<T extends { session: number; square: string; stem: string }>(cells: T[]): T[] {
  return [...cells].sort(
    (a, b) => a.session - b.session || a.square.localeCompare(b.square) || a.stem.localeCompare(b.stem),
  );
}

/**
 * How far apart two crops may sit and still be "the same event" (`tinder.tsx:81`, kept for the
 * phone mode of CONCEPT.md 4.3). A resting hand produces forty identical cards otherwise, which is
 * the failure that killed the tinder band.
 */
export const GROUP_SPAN = 150;

export type LaneCell = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  /** What one keypress writes here, and into which ledger — the two are never guessed at the call site. */
  label: string;
  ledger: "corrections" | "reviewed";
  /** What a marked cell writes instead; `null` leaves it open for a board lane. */
  exception: string | null;
  caption: string;
  note?: string;
};

const p2 = (n: number) => n.toFixed(2);

/**
 * The identity lanes ask the human to rule on a MODEL's word, so the one-key verdict is "FEN
 * stimmt" and the model's read costs a click: ~51 % of the flags are false alarms (Northcutt 2021,
 * CONCEPT.md 4.2) and no page of 60 may write a model's guess into training input by default.
 */
function judgedCell(c: {
  session: number; pos: number; stem: string; square: string; fen_label: string;
  predicted: string; prob: number; margin?: number;
}): LaneCell {
  const margin = c.margin === undefined ? "" : ` · margin ${p2(c.margin)}`;
  return {
    session: c.session,
    pos: c.pos,
    stem: c.stem,
    square: c.square,
    fen_label: c.fen_label,
    label: c.fen_label,
    ledger: "reviewed",
    exception: c.predicted,
    caption: `${c.square} FEN ${c.fen_label}`,
    note: `Modell ${c.predicted} ${p2(c.prob)}${margin}`,
  };
}

/** The cells of a cell lane, grouped by square inside each session. Empty for a board lane. */
export function laneCells(stream: LabelStream, id: LaneId): LaneCell[] {
  if (id === "audit") {
    return (stream.audit ?? []).map(judgedCell);
  }
  if (id === "classwall") {
    return groupBySquare(
      stream.cells.filter((c) => c.kind === "wall"),
    ).map((c) => judgedCell({ ...c, predicted: c.predicted ?? "", prob: c.prob ?? 0 }));
  }
  const kind = id === "unsure" ? "unsure" : id === "control" ? "control" : null;
  if (kind === null) return [];
  return groupBySquare(stream.cells.filter((c) => c.kind === kind)).map((c) => ({
    session: c.session,
    pos: c.pos,
    stem: c.stem,
    square: c.square,
    fen_label: c.fen_label,
    // The mid band pre-labels `occluded`; the control sample states the FEN was right, which is
    // provenance and not a training row (`lib/corrections.ts`).
    label: kind === "unsure" ? "occluded" : c.fen_label,
    ledger: kind === "unsure" ? "corrections" : "reviewed",
    exception: null,
    caption: `${c.square} ${p2(c.score)}`,
  }));
}

/** The boards of a board lane, in stream order. Empty for a cell lane. */
export function laneBoards(stream: LabelStream, id: LaneId): StreamBoard[] {
  if (id === "hands") return stream.boards.filter((b) => Object.keys(b.hands).length > 0);
  if (id === "disagree") return stream.boards.filter((b) => Object.keys(b.disagree).length > 0);
  if (id === "unknown") return stream.boards.filter((b) => b.unknown.length > 0);
  if (id === "all") return stream.boards.filter((b) => b.proposed);
  return [];
}

/**
 * `{square: label}` the lane pre-selects on a board.
 *
 * `FEN unklar` is the odd one: the exporter vouches for nothing there and `labeling.py` DROPS the
 * cell at slice time unless a correction exists, so confirming the FEN's own word is what rescues
 * it (CONCEPT.md D5). `Alle Bretter` pre-selects nothing — it is free-hand paint.
 */
export function laneAccept(board: StreamBoard, id: LaneId): Record<string, string> {
  if (id === "hands") return board.hands;
  if (id === "disagree") return board.disagree;
  if (id === "unknown") {
    const fen = fenLabels(board.fen);
    return Object.fromEntries(board.unknown.map((sq) => [sq, fen[sq] ?? "empty"]));
  }
  return {};
}

export function laneReads(board: StreamBoard, id: LaneId): Record<string, string> {
  if (id === "hands") return board.reads;
  if (id === "disagree") return board.disagreeReads;
  return {};
}

/**
 * A board lane's flagged squares as single crops — the phone renders one crop, never an 8x8
 * (CONCEPT.md 4.3), so every lane has to be answerable cell by cell.
 */
export function boardCells(boards: readonly StreamBoard[], id: LaneId): LaneCell[] {
  return groupBySquare(
    boards.flatMap((board) => {
      const fen = fenLabels(board.fen);
      const reads = laneReads(board, id);
      return Object.entries(laneAccept(board, id)).map(([square, label]) => ({
        session: board.session,
        pos: board.pos,
        stem: board.stem,
        square,
        fen_label: fen[square] ?? "empty",
        label,
        ledger: "corrections" as const,
        exception: null,
        caption: `${square} ${reads[square] ?? label}`,
      }));
    }),
  );
}

/** A board still worth stopping at. `Alle Bretter` never closes: it is touch-up, not a queue. */
export function laneOpen(board: StreamBoard, id: LaneId, decided: Record<string, string>): boolean {
  if (id === "all") return true;
  const accept = laneAccept(board, id);
  return Object.keys(accept).some((sq) => decided[`${board.stem}|${sq}`] === undefined);
}

/** The chip's number, or `null` with the reason the producer still owes this lane its input. */
export function laneCount(stream: LabelStream, id: LaneId): LaneCount {
  if (id === "audit" && stream.audit === null) return { n: null, why: NO_AUDIT };
  if ((id === "disagree" || id === "classwall") && !stream.sessions.some((s) => s.probs))
    return { n: null, why: NO_PROBS };
  const lane = laneById(id);
  return { n: lane.renderer === "board" ? laneBoards(stream, id).length : laneCells(stream, id).length };
}

export type EventGroup<T> = { head: T; members: T[] };

/**
 * Collapse a square's run of crops into events: same square, same FEN word, frames within
 * [GROUP_SPAN]. The head is what the phone shows; a long press answers for the whole group.
 */
export function collapseEvents<T extends { square: string; stem: string; fen_label: string }>(
  cells: T[],
): EventGroup<T>[] {
  const out: EventGroup<T>[] = [];
  for (const cell of cells) {
    const last = out[out.length - 1];
    const near =
      last !== undefined &&
      last.head.square === cell.square &&
      last.head.fen_label === cell.fen_label &&
      Math.abs(Number(cell.stem) - Number(last.members[last.members.length - 1].stem)) <= GROUP_SPAN;
    if (near) last.members.push(cell);
    else out.push({ head: cell, members: [cell] });
  }
  return out;
}
