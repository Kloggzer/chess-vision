"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { CROP, CropGrid, PAGE } from "@/components/crop-grid";
import type { Correction } from "@/lib/corrections";
import type { StreamSession } from "@/lib/label-stream";
import type { LaneCell } from "@/lib/lanes";
import type { Flush, LaneActions, Verdict } from "./stream";

export type CellLaneProps = {
  cells: LaneCell[];
  sessions: StreamSession[];
  decided: Record<string, string>[];
  at: number;
  onAt: (at: number) => void;
  actionsRef: RefObject<LaneActions>;
  onFlush: Flush;
};

const TOUCH = "max-sm:h-11 max-sm:px-3";
const keyOf = (c: LaneCell) => `${c.session}|${c.stem}|${c.square}`;

/**
 * A cell lane, rendered as the bucket grid the buckets already were (REVIEW S10).
 *
 * A page is one keypress. The cells are grouped BY SQUARE, so a page is a handful of squares seen
 * at a few moments each instead of six scattered crops of the same one.
 */
export function CellLane({ cells, sessions, decided, at, onAt, actionsRef, onFlush }: CellLaneProps) {
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set<string>());
  const [page, setPage] = useState(() => Math.floor(at / PAGE));

  const open = useMemo(
    () =>
      cells.filter(
        (c) => (decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined && !skipped.has(keyOf(c)),
      ),
    [cells, decided, skipped],
  );
  const pages = Math.max(1, Math.ceil(open.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = useMemo(() => open.slice(safePage * PAGE, safePage * PAGE + PAGE), [open, safePage]);

  const rows = useCallback(
    (list: LaneCell[], label: (c: LaneCell) => string): Correction[] =>
      list.map((c) => ({
        session_id: sessions[c.session].sessionId,
        frame: c.stem,
        square: c.square,
        label: label(c),
      })),
    [sessions],
  );
  const priorOf = useCallback(
    (list: LaneCell[]) =>
      Object.fromEntries(
        list.map((c) => [
          `${sessions[c.session].sessionId}|${c.stem}|${c.square}`,
          (decided[c.session] ?? {})[`${c.stem}|${c.square}`],
        ]),
      ),
    [decided, sessions],
  );

  /**
   * Enter takes the page's own answer; a marked cell takes the exception's, and where a lane has
   * none it simply leaves the page undecided for a board lane to reach.
   */
  const accept = useCallback(async () => {
    if (slice.length === 0) return;
    const taken = slice.filter((_, i) => !marked.has(i));
    const exceptions = slice.filter((c, i) => marked.has(i) && c.exception !== null);
    const writes: Verdict[] = [
      { rows: rows(taken.filter((c) => c.ledger === "corrections"), (c) => c.label), ledger: "corrections" },
      { rows: rows(taken.filter((c) => c.ledger === "reviewed"), (c) => c.label), ledger: "reviewed" },
      { rows: rows(exceptions, (c) => c.exception!), ledger: "corrections" },
    ];
    await onFlush(slice[0].pos, writes, priorOf(slice));
    setSkipped((s) => new Set([...s, ...slice.map(keyOf)]));
    setMarked(new Set());
    setCursor(0);
  }, [marked, onFlush, priorOf, rows, slice]);

  /** Backspace — this page is not answerable here; it leaves without a row. */
  const discard = useCallback(() => {
    setSkipped((s) => new Set([...s, ...slice.map(keyOf)]));
    setMarked(new Set());
    setCursor(0);
  }, [slice]);

  /** A palette key states the label for the MARKED cells, straight into the training input. */
  const brush = useCallback(
    async (label: string) => {
      const picked = slice.filter((_, i) => marked.has(i));
      if (picked.length === 0) return;
      await onFlush(picked[0].pos, [{ rows: rows(picked, () => label), ledger: "corrections" }], priorOf(picked));
      setSkipped((s) => new Set([...s, ...picked.map(keyOf)]));
      setMarked(new Set());
    },
    [marked, onFlush, priorOf, rows, slice],
  );

  const toggle = (i: number) =>
    setMarked((m) => {
      const next = new Set(m);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const now = useRef({ accept, discard, brush, cursor, slice });
  useEffect(() => {
    now.current = { accept, discard, brush, cursor, slice };
  });
  useEffect(() => {
    actionsRef.current = {
      commit: () => void now.current.accept(),
      reject: () => now.current.discard(),
      toggleAt: () => toggle(now.current.cursor),
      brush: (label) => void now.current.brush(label),
      step: (delta) => setCursor((i) => Math.max(0, Math.min(now.current.slice.length - 1, i + delta))),
      undo: () => false,
    };
  }, [actionsRef]);

  // The header counts in the LANE's order, so the position survives a switch to a board lane.
  const head = slice[0];
  useEffect(() => {
    if (head) onAt(cells.indexOf(head));
  }, [cells, head, onAt]);

  if (!head) return <p className="text-muted-foreground text-sm">Diese Lane ist abgearbeitet.</p>;

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <strong>{head.ledger === "reviewed" ? "Vorbelegung: FEN stimmt" : `Vorbelegung: ${head.label}`}</strong>
        <span className="text-muted-foreground">
          {open.length} Zellen offen · Seite {safePage + 1}/{pages} · {marked.size} Ausnahmen
          {head.exception === null ? "" : " (Ausnahme = das Modell hat recht)"}
        </span>
        <Button className={`ml-auto ${TOUCH}`} onClick={() => void accept()} size="sm">
          ⏎ {slice.length - marked.size} Zellen bestätigen
        </Button>
        <Button className={TOUCH} disabled={safePage + 1 >= pages} onClick={() => setPage(safePage + 1)} size="sm" variant="outline">
          Seite überspringen
        </Button>
      </div>

      <CropGrid
        cells={slice.map((cell) => ({
          key: keyOf(cell),
          src: `/api/cell/${sessions[cell.session].name}/${cell.stem}/${cell.square}?size=${CROP}`,
          alt: `${cell.square} @ ${cell.stem}`,
          caption: cell.caption,
          note: cell.note,
        }))}
        cursor={cursor}
        marked={marked}
        onPick={(i) => {
          setCursor(i);
          toggle(i);
        }}
      />
    </div>
  );
}
