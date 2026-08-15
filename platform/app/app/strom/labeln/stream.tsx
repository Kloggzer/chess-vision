"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { STREAM_PALETTE } from "@/components/board-paint";
import type { Correction, Ledger } from "@/lib/corrections";
import type { LabelStream, StreamBoard } from "@/lib/label-stream";
import {
  LANES,
  type LaneId,
  boardCells,
  laneAccept,
  laneBoards,
  laneCells,
  laneChip,
  laneCount,
  laneById,
  laneOpen,
  laneReads,
  keepPosition,
} from "@/lib/lanes";
import { addRows, emptyTally } from "@/lib/session-tally";
import { BoardLane } from "./board-lane";
import { CellLane } from "./cell-lane";
import { MobileSort } from "./mobile-sort";
import { SquareGrid } from "./square-grid";

/**
 * LABELN — every board of every session, one continuous feed (CONCEPT.md §4.2).
 *
 * The lane bar is a FILTER over one ordered stream, never a page: every item carries the same
 * ordinal, so switching a lane is a search in that order and keeps you where you were. The
 * renderer is the lane's own (board vs. cell grid, REVIEW S10), and so is its denominator.
 */
export type Verdict = { rows: Correction[]; ledger: Ledger };
/** One flush, with the rows that put it back — `z` after the flush needs both (§4.2.2). */
type Batch = { pos: number; revert: Verdict[] };
/** `prior` holds what each cell fell back FROM, keyed `session_id|frame|square`. */
export type Flush = (
  pos: number,
  writes: Verdict[],
  prior: Record<string, string | undefined>,
) => Promise<void>;

/** Everything the one key handler can ask of the active renderer. */
export type LaneActions = {
  commit?: () => void;
  reject?: () => void;
  flagsOff?: () => void;
  toggleAt?: () => void;
  gridAt?: () => void;
  flood?: () => void;
  step?: (delta: number) => void;
  nextPly?: () => void;
  brush?: (label: string) => void;
  undo?: () => boolean;
};

/** `null` = a tombstone took the cell back out of the judged map. */
type Written = Record<number, Record<string, string | null>>;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
  return answer;
}

const KEYS: [string, string][] = [
  ["⏎", "commit → nächstes"],
  ["⌫", "Flags aus → nächstes"],
  ["f", "Flags aus, hier bleiben"],
  ["⎵", "Flag unter dem Zeiger"],
  ["⇧⎵", "Raster für dieses Feld"],
  ["a", "alles occluded"],
  ["← →", "Brett blättern"],
  ["⇧⏎", "nächster Halbzug"],
  ["z", "zurück"],
  ["x", "Brett raus"],
  ["X", "Aufnahme raus"],
  [".", "/game (neuer Tab)"],
];

export function LabelnStream({ stream }: { stream: LabelStream }) {
  const [lane, setLane] = useState<LaneId>("hands");
  const [at, setAt] = useState(0);
  const [written, setWritten] = useState<Written>({});
  const [thrown, setThrown] = useState<ReadonlySet<string>>(new Set<string>());
  const [dropped, setDropped] = useState<ReadonlySet<number>>(new Set<number>());
  const [tally, setTally] = useState(emptyTally);
  const [history, setHistory] = useState<Batch[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [grid, setGrid] = useState<{ session: number; square: string } | null>(null);
  const [gaps, setGaps] = useState<number[]>([]);
  const [phone, setPhone] = useState(false);
  const actions = useRef<LaneActions>({});
  const decidedAt = useRef<number | null>(null);

  // The phone gets one crop and four buckets (§4.3); the board is a desktop instrument.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const read = () => setPhone(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  const decided = useMemo(
    () =>
      stream.decided.map((base, i) => {
        const overlay = written[i];
        if (!overlay) return base;
        const out = { ...base };
        for (const [key, label] of Object.entries(overlay)) {
          if (label === null) delete out[key];
          else out[key] = label;
        }
        return out;
      }),
    [stream.decided, written],
  );

  const live = useCallback(
    (b: StreamBoard) => !dropped.has(b.session) && !thrown.has(`${b.session}|${b.stem}`),
    [dropped, thrown],
  );
  const boards = useMemo(() => laneBoards(stream, lane).filter(live), [live, lane, stream]);
  const cells = useMemo(() => {
    const raw = laneById(lane).renderer === "cells" ? laneCells(stream, lane) : boardCells(boards, lane);
    return raw.filter((c) => !dropped.has(c.session) && !thrown.has(`${c.session}|${c.stem}`));
  }, [boards, dropped, lane, stream, thrown]);

  const board = laneById(lane).renderer === "board" ? boards[Math.min(at, boards.length - 1)] : undefined;
  const positions = useMemo(
    () => (laneById(lane).renderer === "board" ? boards.map((b) => b.pos) : cells.map((c) => c.pos)),
    [boards, cells, lane],
  );
  const pos = positions[Math.min(at, positions.length - 1)] ?? 0;
  const length = laneById(lane).renderer === "board" ? boards.length : cells.length;

  function switchLane(id: LaneId) {
    const next =
      laneById(id).renderer === "board"
        ? laneBoards(stream, id).filter(live).map((b) => b.pos)
        : (laneById(id).renderer === "cells" ? laneCells(stream, id) : []).map((c) => c.pos);
    setLane(id);
    setAt(keepPosition(next, pos));
  }

  /** Median seconds between decisions, in memory and reset by a reload — §6.1 allows no other. */
  function ticked() {
    const stamp = Date.now();
    const previous = decidedAt.current;
    if (previous !== null) setGaps((g) => [...g, stamp - previous]);
    decidedAt.current = stamp;
  }

  const indexOf = useMemo(
    () => new Map(stream.sessions.map((s, i) => [s.sessionId, i])),
    [stream.sessions],
  );
  const overlay = useCallback(
    (rows: Correction[], label: (r: Correction) => string | null) => {
      setWritten((w) => {
        const next = { ...w };
        for (const r of rows) {
          const i = indexOf.get(r.session_id);
          if (i === undefined) continue;
          next[i] = { ...next[i], [`${r.frame}|${r.square}`]: label(r) };
        }
        return next;
      });
    },
    [indexOf],
  );

  /**
   * The tombstone carries the value the cell falls back to, so the row is a correct last-wins
   * label for `load_corrections` and a delete for `decidedKeys` (§4.2.2). It goes into the ledger
   * the row came FROM: a reviewed row left judged keeps the board closed, which is the half
   * REVIEW S4 says a superseding row cannot fix.
   */
  const flush = useCallback<Flush>(
    async (pos_, writes, prior) => {
      const real = writes.filter((w) => w.rows.length > 0);
      if (real.length === 0) return;
      try {
        for (const { rows, ledger } of real) {
          await post("/api/corrections", { rows, ledger });
          setTally((t) => addRows(t, rows, ledger));
          overlay(rows, (r) => r.label);
        }
        const revert = real.map(({ rows, ledger }) => ({
          ledger,
          rows: rows.map((r) => ({
            ...r,
            label: prior[`${r.session_id}|${r.frame}|${r.square}`] ?? r.label,
            retract: true as const,
          })),
        }));
        setHistory((h) => [...h, { pos: pos_, revert }]);
        ticked();
      } catch (error) {
        setNote(String(error));
      }
    },
    [overlay],
  );

  /** `z` once the rows have left: the tombstone, and the board it reopens. */
  const undoFlushed = useCallback(async () => {
    const batch = history[history.length - 1];
    if (!batch) return;
    setHistory((h) => h.slice(0, -1));
    try {
      for (const { rows, ledger } of batch.revert) {
        await post("/api/corrections", { rows, ledger });
        overlay(rows, () => null);
      }
      setAt(keepPosition(positions, batch.pos));
      setNote(`zurückgenommen — ${batch.revert.reduce((n, v) => n + v.rows.length, 0)} Zellen wieder offen`);
    } catch (error) {
      setNote(String(error));
    }
  }, [history, overlay, positions]);

  /** The frame under the cursor, whichever renderer is up — a cell lane throws ITS board out too. */
  const here = board ?? cells[Math.min(at, cells.length - 1)];

  /** `x` — the picture is junk. A verdict, never a label, so training input cannot be corrupted. */
  async function throwBoard() {
    if (!here) return;
    const session = stream.sessions[here.session];
    setThrown((t) => new Set(t).add(`${here.session}|${here.stem}`));
    setNote(`${here.stem} raus — kein Label geschrieben, bleibt raus (review-notes.jsonl)`);
    try {
      await post("/api/review-notes", {
        rows: [{ session_id: session.sessionId, frame: here.stem, verdict: "unusable-board", reason: "Labeln-Strom: x" }],
      });
    } catch (error) {
      setNote(String(error));
    }
  }

  /** `X` — the whole recording. The rows it already wrote stay: the ledger is append-only. */
  async function throwSession() {
    const index = here?.session;
    if (index === undefined) return;
    const session = stream.sessions[index];
    setDropped((d) => new Set(d).add(index));
    setNote(`${session.name} ist nutzlos — Corrections bleiben (append-only, /corpus zählt sie als Pool ohne Snapshot)`);
    try {
      await post(`/api/useless/${session.name}`, { useless: true, reason: "Labeln-Strom: X" });
    } catch (error) {
      setNote(String(error));
    }
  }

  // One listener, one keymap — the renderers publish what they can do instead of binding keys of
  // their own, which is how `bucket.tsx` and `drilldown.tsx` came to disagree about Space.
  const handler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    // The accelerator grid owns the keyboard while it is up: Enter must not commit the board behind it.
    if (grid) {
      if (event.key === "Escape") setGrid(null);
      return;
    }
    const now = actions.current;
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        return event.shiftKey ? now.nextPly?.() : now.commit?.();
      case "Backspace":
        event.preventDefault();
        return now.reject?.();
      case "f":
        event.preventDefault();
        return now.flagsOff?.();
      case " ":
        event.preventDefault();
        return event.shiftKey ? now.gridAt?.() : now.toggleAt?.();
      case "a":
        event.preventDefault();
        return now.flood?.();
      case "ArrowLeft":
        event.preventDefault();
        return now.step?.(-1);
      case "ArrowRight":
        event.preventDefault();
        return now.step?.(1);
      case "z":
        event.preventDefault();
        if (!now.undo?.()) void undoFlushed();
        return;
      case "x":
        event.preventDefault();
        return void throwBoard();
      case "X":
        event.preventDefault();
        return void throwSession();
      case ".": {
        event.preventDefault();
        if (here) window.open(`/game/${stream.sessions[here.session].name}`, "_blank", "noopener");
        return;
      }
      default: {
        const hit = STREAM_PALETTE.find(([k]) => k === event.key);
        if (!hit) return;
        event.preventDefault();
        now.brush?.(hit[1]);
      }
    }
  };
  // No dependency array: the listener above reads THIS render's closure through the ref.
  useEffect(() => {
    handler.current = onKey;
  });

  const session = stream.sessions[here?.session ?? 0];
  const counts = useMemo(() => LANES.map((l) => laneCount(stream, l.id)), [stream]);
  const seconds = median(gaps);
  const open = laneById(lane).renderer === "board"
    ? boards.filter((b) => laneOpen(b, lane, decided[b.session] ?? {})).length
    : cells.filter((c) => (decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined).length;
  const pct = stream.progress.boards > 0 ? (stream.progress.done / stream.progress.boards) * 100 : 0;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {LANES.map((l, i) => {
          const chip = laneChip(l, counts[i]);
          return (
            // The reason sits on the WRAPPER: a disabled button carries no tooltip, and a `—` chip
            // whose reason cannot be read is the "0" it exists to avoid.
            <span key={l.id} title={chip.title}>
              <Button
                className="max-sm:h-11 max-sm:px-3"
                disabled={counts[i].n === null}
                // Blurred: the stream listens on `window`, and a focused button eats the Enter.
                onClick={(event) => {
                  event.currentTarget.blur();
                  switchLane(l.id);
                }}
                size="sm"
                variant={lane === l.id ? "default" : "outline"}
              >
                {chip.text}
              </Button>
            </span>
          );
        })}
      </div>

      <header className="border-border flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm">
        <span className="text-muted-foreground tabular-nums">
          {Math.min(at + 1, length)}/{length} {laneById(lane).unit}
        </span>
        <span className="text-muted-foreground tabular-nums" title="Bretter mit Vorschlägen, korpusweit">
          Strom {stream.progress.done}/{stream.progress.boards} Bretter · {pct.toFixed(1)} %
        </span>
        {session ? (
          <span className="text-muted-foreground font-mono text-xs">
            {session.sessionId}
            {board ? ` · ${board.stem} · ply ${board.ply}` : ""}
            {session.proposals ? "" : " · nur wegen unknown_squares im Strom"}
          </span>
        ) : null}
        <span className="text-muted-foreground ml-auto tabular-nums" title="Median seit dem Laden">
          {seconds === null ? "— s" : `${(seconds / 1000).toFixed(1)} s`} · Rest ≈{" "}
          {seconds === null ? "—" : hours((seconds / 1000) * open)}
        </span>
      </header>

      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}

      <div className="gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          {length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Diese Lane ist leer — nichts wartet hier auf ein Urteil.
            </p>
          ) : phone ? (
            <MobileSort
              actionsRef={actions}
              cells={cells}
              decided={decided}
              key={lane}
              onFlush={flush}
              onThrow={() => void throwBoard()}
              onUndo={() => void undoFlushed()}
              sessions={stream.sessions}
              tally={tally}
            />
          ) : board ? (
            <BoardLane
              accept={laneAccept(board, lane)}
              actionsRef={actions}
              board={board}
              decided={decided[board.session] ?? {}}
              name={stream.sessions[board.session].name}
              onFlush={flush}
              onGrid={(square) => setGrid({ session: board.session, square })}
              onNext={(ply) => setAt(nextOpen(boards, at, lane, decided, ply))}
              onStep={(delta) => setAt((i) => Math.max(0, Math.min(boards.length - 1, i + delta)))}
              reads={laneReads(board, lane)}
              sessionId={stream.sessions[board.session].sessionId}
            />
          ) : (
            <CellLane
              actionsRef={actions}
              at={at}
              cells={cells}
              decided={decided}
              key={lane}
              onAt={setAt}
              onFlush={flush}
              sessions={stream.sessions}
            />
          )}
        </div>

        <aside className="mt-4 space-y-3 lg:mt-0">
          <Panel open={open} tally={tally} unit={laneById(lane).unit} />
          <div className="border-border rounded-lg border px-3 py-2">
            <p className="text-muted-foreground mb-1 text-xs font-medium">Tasten</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {KEYS.map(([k, what]) => (
                <Fragment key={k}>
                  <dt>
                    <kbd className="text-foreground font-mono">{k}</kbd>
                  </dt>
                  <dd className="text-muted-foreground">{what}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      {grid ? (
        <SquareGrid
          cells={stream.cells.filter((c) => c.session === grid.session && c.square === grid.square)}
          decided={decided[grid.session] ?? {}}
          name={stream.sessions[grid.session].name}
          onClose={() => setGrid(null)}
          onFlush={flush}
          sessionId={stream.sessions[grid.session].sessionId}
          square={grid.square}
        />
      ) : null}
    </section>
  );
}

/** The next board still worth stopping at; `ply` set means the next one of a DIFFERENT half-move. */
function nextOpen(
  boards: readonly StreamBoard[],
  from: number,
  lane: LaneId,
  decided: Record<string, string>[],
  ply?: number,
): number {
  for (let i = from + 1; i < boards.length; i++) {
    const b = boards[i];
    if (ply !== undefined && b.ply === ply) continue;
    if (laneOpen(b, lane, decided[b.session] ?? {})) return i;
  }
  return Math.min(from + 1, boards.length - 1);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const hours = (s: number) => (s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

/** §6.1 — what THIS sitting did, in memory, reset by a reload. */
function Panel({
  tally,
  open,
  unit,
}: {
  tally: ReturnType<typeof emptyTally>;
  open: number;
  unit: string;
}) {
  const items: [string, number, string][] = [
    ["Bretter fertig", tally.boards.size, "distinkte Frames, die seit dem Laden in ein Ledger geschrieben haben"],
    ["Zellen occluded", tally.cellsOccluded, "Zeilen mit label occluded in corrections.jsonl"],
    ["Zellen bestätigt", tally.cellsConfirmed, "Zeilen in reviewed.jsonl — der FEN stimmte"],
    ["Figuren korrigiert", tally.piecesCorrected, "Zeilen mit einem Label außer occluded und empty"],
  ];
  return (
    <div className="border-border bg-muted/30 rounded-lg border px-3 py-2 text-sm">
      <p className="text-muted-foreground mb-1 flex items-baseline justify-between text-xs font-medium">
        DIESE SITZUNG <span className="font-normal">seit dem Laden</span>
      </p>
      <dl className="space-y-0.5">
        {items.map(([label, value, why]) => (
          <div className="flex items-baseline justify-between" key={label} title={why}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground font-medium tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">offen in dieser Lane</dt>
          <dd className="text-foreground font-medium tabular-nums">
            {open} {unit}
          </dd>
        </div>
      </dl>
    </div>
  );
}
