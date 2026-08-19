/**
 * The lanes of the LABELN stream (CONCEPT.md 4.2) — pure, so the stream's client half can import
 * it (`lib/client-boundary.test.ts`).
 *
 * A lane is a FILTER over one stream, never a page. The chip prints ONE number, because the only
 * question it answers is whether work is left ("da reicht eine zahl", User 2026-08-18); the unit
 * and the denominator moved into its tooltip. A lane the producer has not filled yet prints `—`
 * with its reason — `0` would claim there is no such work when nobody has been asked.
 */

import { coveragePct, isIdentity } from "@/lib/classes";
import { fenLabels } from "@/lib/fen";
import type { LabelStream, StreamBoard } from "@/lib/label-stream";
import type { QueryHit } from "@/lib/query";

export type LaneId =
  | "disagree"
  | "classwall"
  | "unknown"
  | "control"
  | "audit"
  | "rules"
  | "all";

/** A board lane paints the 8x8; a cell lane renders the crop grid, grouped by square (REVIEW S10). */
export type LaneRenderer = "board" | "cells";
export type LaneUnit = "Bretter" | "Zellen";

export type Lane = {
  id: LaneId;
  /** Its own URL segment under `/strom/labeln` — a lane is a place, so Back and a bookmark work. */
  slug: string;
  label: string;
  renderer: LaneRenderer;
  unit: LaneUnit;
  /** What the count is measured against — the chip's tooltip, never the chip itself. */
  denominator: string;
};

export const LANES: readonly Lane[] = [
  { id: "disagree", slug: "modell-bretter", label: "Modell ≠ FEN · Bretter", renderer: "board", unit: "Bretter", denominator: "Bretter mit Modell-Lesarten" },
  // Named after its QUESTION, not after the wall metaphor: it is the same "Modell ≠ FEN" one cell
  // at a time, and nobody looking for that found it under `Klassenwand` (User, 2026-08-17).
  { id: "classwall", slug: "modell-zellen", label: "Modell ≠ FEN · Zellen", renderer: "cells", unit: "Zellen", denominator: "Zellen, auf die die Abfrage im Lane-Kopf passt" },
  {
    id: "unknown",
    slug: "fen-unklar",
    label: "FEN unklar",
    renderer: "board",
    unit: "Bretter",
    // Its own corpus on purpose: an unknown square is the exporter's own doubt, measured on every
    // exported session whether or not a model has ever read it.
    denominator: "Bretter mit unknown_squares über die exportierten Sessions",
  },
  {
    id: "control",
    slug: "stichprobe",
    label: "Stichprobe",
    renderer: "cells",
    unit: "Zellen",
    // Its own corpus: the sample is drawn from the session log, so it covers every exported
    // recording instead of the one session a model has read.
    denominator: "Kontroll-Stichprobe über die ruhigen Frames der exportierten Sessions",
  },
  { id: "audit", slug: "audit", label: "Audit", renderer: "cells", unit: "Zellen", denominator: "geflaggte Zellen des k-fold-Audits" },
  {
    id: "rules",
    slug: "regelbruch",
    label: "Regelbruch",
    renderer: "board",
    unit: "Bretter",
    // Its own corpus: a violated frame is in the lane because its LEDGER says so, whether or not
    // a model ever read it.
    denominator: "Bretter, deren korrigierte Stellung eine Regel bricht",
  },
  { id: "all", slug: "alle", label: "Alle Bretter", renderer: "board", unit: "Bretter", denominator: "Bretter im Strom" },
];

export const laneById = (id: LaneId): Lane => LANES.find((l) => l.id === id)!;
export const laneBySlug = (slug: string): Lane | undefined => LANES.find((l) => l.slug === slug);
export const DEFAULT_LANE = LANES[0];
export const lanePath = (id: LaneId) => `/strom/labeln/${laneById(id).slug}`;

/** Why a lane is empty, when it is empty because nobody produced its input yet. */
export const NO_READS =
  "keine Modell-Lesarten auf der Platte — `chesslab realgames model-read <name> --model <run>` " +
  "lief noch nicht. Das heißt „noch nicht gefragt“, nicht „nichts gefunden“ (CONCEPT.md D2).";
export const NO_QUERY =
  "/api/query hat nicht geantwortet — die Klassenwand ist eine serverseitige Abfrage, und ohne " +
  "ihre Antwort ist die Zahl unbekannt, nicht null.";
export const NO_AUDIT =
  "data/manifests/audit-flags.jsonl fehlt — der Zwei-Hälften-Kreuztest lief noch nicht.";
export const NO_RULES =
  "data/manifests/correction-violations.jsonl fehlt — `chesslab realgames audit-corrections` lief noch nicht.";

export type LaneCount = {
  /** OPEN items — the stream shows nothing else. `null` = the producer owes this lane its input. */
  n: number | null;
  why?: string;
  /** Everything the lane holds, judged or not, so `n` can never be read as the whole corpus. */
  total?: number;
  /** Counted from the stream when the static wording cannot say it — "… über 18 Bundles". */
  denominator?: string;
};

/** ONE number — is there anything left here. What it is measured against is the tooltip's job. */
export function laneChip(lane: Lane, count: LaneCount): { text: string; title: string } {
  const over = count.denominator ?? lane.denominator;
  if (count.n === null) return { text: `${lane.label} —`, title: count.why ?? "kein Input auf der Platte" };
  const total = count.total ?? count.n;
  return {
    text: `${lane.label} ${count.n}`,
    title: `${count.n} offen von ${total} ${lane.unit} · ${over}`,
  };
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

/**
 * What SAM measured on ONE crop, as its card prints it. A page mixes frames and sessions, so the
 * lookup takes the whole map; `null` covers both "no alpha was ever cut here" and "nothing worth
 * printing", because a card has no room to tell those apart — the lane head's chip does.
 */
export function cellCoverage(
  coverage: Record<string, Record<string, number>>[],
  cell: { session: number; stem: string; square: string },
): string | null {
  const value = coverage[cell.session]?.[cell.stem]?.[cell.square];
  return value === undefined ? null : coveragePct(value);
}

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

/**
 * The identity lanes ask the human to rule on a MODEL's word, so the one-key verdict is "FEN
 * stimmt" and the model's read costs a click: ~51 % of the flags are false alarms (Northcutt 2021,
 * CONCEPT.md 4.2) and no page of 60 may write a model's guess into training input by default.
 */
function judgedCell(c: {
  session: number; pos: number; stem: string; square: string; fen_label: string;
  predicted: string; prob: number; margin?: number;
}): LaneCell {
  // Only one of the 13: `occluded` is measured now and `validate` rejects it, so offering it as
  // "das Modell hat recht" would 400 the whole page instead of writing one row.
  const predicted = isIdentity(c.predicted) ? c.predicted : null;
  return {
    session: c.session,
    pos: c.pos,
    stem: c.stem,
    square: c.square,
    fen_label: c.fen_label,
    label: c.fen_label,
    ledger: "reviewed",
    exception: predicted,
    caption: `${c.square} · FEN ${c.fen_label}`,
    ...(predicted ? { note: `Modell ${predicted}` } : {}),
  };
}

/**
 * Eine Behauptung pro Seite, wie im Audit: FEN-Gruppe → Modell-Wort, größte zuerst. Innerhalb der
 * Untergruppe Feld+Frame statt Score — Score-Ordnung verstreute die sechs Crops eines Feldes über
 * sechs Seiten („ich sehe immer noch alte Bilder", 2026-08-09), und DIE Lektion bleibt.
 */
function byClaim(cells: LaneCell[]): LaneCell[] {
  const group = new Map<string, number>();
  const sub = new Map<string, number>();
  for (const c of cells) {
    group.set(c.fen_label, (group.get(c.fen_label) ?? 0) + 1);
    const key = `${c.fen_label}|${c.exception ?? ""}`;
    sub.set(key, (sub.get(key) ?? 0) + 1);
  }
  return [...cells].sort(
    (a, b) =>
      (group.get(b.fen_label) ?? 0) - (group.get(a.fen_label) ?? 0) ||
      a.fen_label.localeCompare(b.fen_label) ||
      (sub.get(`${b.fen_label}|${b.exception ?? ""}`) ?? 0) - (sub.get(`${a.fen_label}|${a.exception ?? ""}`) ?? 0) ||
      (a.exception ?? "").localeCompare(b.exception ?? "") ||
      a.square.localeCompare(b.square) ||
      a.stem.localeCompare(b.stem),
  );
}

/** The `Klassenwand` answer as the lane sees it: its cells, and the question that produced them. */
export type WallQuery = { cells: LaneCell[]; text: string };

/**
 * The query's hits placed IN THE STREAM — the server answers with session ids and frame stems, the
 * ordinal and the FEN come from the boards the stream already carries. A hit on a board no lane
 * shows (unusable, thrown out) has no ordinal and drops here rather than being answered off-screen.
 */
export function wallCells(hits: readonly QueryHit[], stream: LabelStream): LaneCell[] {
  const index = new Map(stream.sessions.map((s, i) => [s.sessionId, i]));
  const boards = new Map(stream.boards.map((b) => [`${b.session}|${b.stem}`, b]));
  const out: LaneCell[] = [];
  for (const hit of hits) {
    const session = index.get(hit.session);
    if (session === undefined) continue;
    const board = boards.get(`${session}|${hit.stem}`);
    if (!board) continue;
    const fen = fenLabels(board.fen);
    for (const square of hit.squares) {
      out.push(
        judgedCell({
          session,
          pos: board.pos,
          stem: hit.stem,
          square,
          fen_label: fen[square] ?? "empty",
          predicted: hit.accept[square] ?? "",
          prob: 0,
        }),
      );
    }
  }
  return out;
}

/** The cells of a cell lane, one claim per page. Empty for a board lane. */
export function laneCells(stream: LabelStream, id: LaneId, wall?: WallQuery): LaneCell[] {
  if (id === "audit") {
    return (stream.audit ?? []).map(judgedCell);
  }
  if (id === "classwall") {
    return byClaim(groupBySquare(wall?.cells ?? []));
  }
  if (id !== "control") return [];
  // EIN ⏎ überall: „FEN stimmt" → reviewed. Ohne Modellwort, weil die Stichprobe blind sein muss.
  return byClaim(
    groupBySquare(stream.cells).map((c) => ({
      session: c.session,
      pos: c.pos,
      stem: c.stem,
      square: c.square,
      fen_label: c.fen_label,
      label: c.fen_label,
      ledger: "reviewed" as const,
      exception: null,
      caption: `${c.square} · FEN ${c.fen_label}`,
    })),
  );
}

/** The boards of a board lane, in stream order. Empty for a cell lane. */
export function laneBoards(stream: LabelStream, id: LaneId): StreamBoard[] {
  if (id === "disagree") return stream.boards.filter((b) => Object.keys(b.disagree).length > 0);
  if (id === "unknown") return stream.boards.filter((b) => b.unknown.length > 0);
  if (id === "rules") return stream.boards.filter((b) => b.violations.length > 0);
  if (id === "all") return stream.boards;
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
  if (id === "disagree") return board.disagree;
  // Was auf der Platte steht, nicht was zu schreiben wäre: der Regelbruch beweist, dass Korrektur
  // ODER FEN falsch ist, nie welche von beiden. Ein Klick zykelt Korrektur ⇄ FEN-Wort.
  if (id === "rules") return board.violating;
  if (id === "unknown") {
    const fen = fenLabels(board.fen);
    return Object.fromEntries(board.unknown.map((sq) => [sq, fen[sq] ?? "empty"]));
  }
  return {};
}

export function laneReads(board: StreamBoard, id: LaneId): Record<string, string> {
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

/**
 * A board still worth stopping at — the lane's own unit of work, unanswered.
 *
 * `Alle Bretter` is free-hand touch-up and closes only when every square carries a verdict.
 * `Regelbruch` never closes: its squares are corrections ON FILE, so the ledger calls them judged
 * by construction — the board leaves the lane when the audit runs again and drops its row.
 */
export function laneOpen(board: StreamBoard, id: LaneId, decided: Record<string, string>): boolean {
  const undecided = (squares: string[]) => squares.some((sq) => decided[`${board.stem}|${sq}`] === undefined);
  if (id === "rules") return true;
  if (id === "all") return undecided(Object.keys(fenLabels(board.fen)));
  return undecided(Object.keys(laneAccept(board, id)));
}

/**
 * What the lane still asks for, against the ledger AS LOADED.
 *
 * The server's snapshot and not the live overlay: an item answered in this sitting must keep its
 * place until the next load, or the list would resize under the cursor on every commit and `z`
 * would land somewhere else than it took the row from.
 */
export function openBoards(stream: LabelStream, id: LaneId): StreamBoard[] {
  return laneBoards(stream, id).filter((b) => laneOpen(b, id, stream.decided[b.session] ?? {}));
}

export function openCells(stream: LabelStream, id: LaneId, wall?: WallQuery): LaneCell[] {
  return laneCells(stream, id, wall).filter(
    (c) => (stream.decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined,
  );
}

/** Open and total, or `null` with the reason the producer still owes this lane its input. */
export function laneCount(stream: LabelStream, id: LaneId, wall?: WallQuery): LaneCount {
  if (id === "audit" && stream.audit === null) return { n: null, why: NO_AUDIT };
  if (id === "rules" && !stream.rules) return { n: null, why: NO_RULES };
  if ((id === "disagree" || id === "classwall") && !stream.sessions.some((s) => s.probs))
    return { n: null, why: NO_READS };
  if (id === "classwall" && !wall) return { n: null, why: NO_QUERY };
  const board = laneById(id).renderer === "board";
  const total = board ? laneBoards(stream, id).length : laneCells(stream, id, wall).length;
  const n = board ? openBoards(stream, id).length : openCells(stream, id, wall).length;
  if (id === "classwall") return { n, total, denominator: `Zellen, auf die »${wall!.text}« passt` };
  // Ein Modell hat bisher EINE Session gelesen; der Rest des Korpus ist NICHT GEMESSEN, nicht einig.
  if (id === "disagree")
    return { n, total, denominator: `Bretter mit Modell-Lesarten — ${stream.reads.boards} von ${stream.boards.length}, der Rest ist nicht gemessen` };
  return { n, total };
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
