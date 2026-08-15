"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CROP, CropGrid, PAGE } from "@/components/crop-grid";
import type { Correction, Ledger } from "@/lib/corrections";
import type { Proposal } from "@/lib/proposals";
import { writeRows } from "./write";

/** A fingertip is ~9 mm: 44 px below `sm`, the desktop's own density above it. See `drilldown.tsx`. */
const TOUCH = "max-sm:h-11 max-sm:px-3";

export type BucketProps = {
  name: string;
  sessionId: string;
  cells: Proposal[];
  /** `confirm` writes one row per crop; `control` is the pre-label CHECK and writes nothing. */
  kind: "confirm" | "control";
  decided: Record<string, string>;
  onException: (cells: Proposal[]) => void;
  /** The rows that landed, not their count — see `drilldown.tsx`. */
  onWritten: (rows: Correction[], ledger: Ledger) => void;
  onError: (error: unknown) => void;
  /** Fired once when the LAST page is confirmed — the session-done banner listens. */
  onDone?: () => void;
};

const keyOf = (c: Proposal) => `${c.frame}|${c.square}`;

/**
 * Verification labeling: one page, one pre-label, Enter confirms.
 * Bucket empties and stays empty on reload; confirm/control record to different ledgers.
 */
export function BucketGrid(props: BucketProps) {
  const { name, sessionId, cells, kind, decided, onException, onWritten, onError, onDone } = props;
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [cols, setCols] = useState(10);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  // Grouped BY SQUARE, not score — score order scatters crops far apart (2026-08-09).
  const remaining = useMemo(
    () =>
      cells
        .filter((c) => !decided[keyOf(c)] && !handled.has(keyOf(c)))
        .sort((a, b) => a.square.localeCompare(b.square) || a.frame.localeCompare(b.frame)),
    [cells, decided, handled],
  );
  const pages = Math.max(1, Math.ceil(remaining.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = useMemo(
    () => remaining.slice(safePage * PAGE, safePage * PAGE + PAGE),
    [remaining, safePage],
  );

  const emptied = cells.length > 0 && remaining.length === 0;
  useEffect(() => {
    if (emptied) onDone?.();
  }, [emptied, onDone]);

  const toggle = useCallback((i: number) => {
    setMarked((m) => {
      const next = new Set(m);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  }, []);

  const confirmPage = useCallback(async () => {
    const exceptions = slice.filter((_, i) => marked.has(i));
    const accepted = slice.filter((_, i) => !marked.has(i));
    try {
      // Both kinds write; they write to different LEDGERS. `confirm` states a new label and
      // belongs in the training input; `control` states that the FEN was already right, which
      // teaches a slice nothing and belongs in the review record — but it is still work, and
      // recording it is what stops the same page coming back after every reload.
      const rows = accepted.map((c) => ({
        session_id: sessionId,
        frame: c.frame,
        square: c.square,
        label: kind === "confirm" ? "occluded" : c.fen_label,
      }));
      const ledger: Ledger = kind === "confirm" ? "corrections" : "reviewed";
      const written = await writeRows(rows, ledger);
      onWritten(rows, ledger);
      onException(exceptions);
      setNote(
        kind === "confirm"
          ? `${written} Zellen geschrieben, ${exceptions.length} in die Mal-Queue`
          : `${written} Zellen als geprüft vermerkt (keine Trainingszeile — der FEN stimmte ` +
            `schon); ${exceptions.length} in die Mal-Queue`,
      );
      // The whole page leaves the bucket — accepted as decided, exceptions to the painting queue.
      setHandled((h) => new Set([...h, ...slice.map(keyOf)]));
      setMarked(new Set());
      setCursor(0);
    } catch (error) {
      onError(error);
    }
  }, [slice, marked, kind, sessionId, onException, onWritten, onError]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const keys = ["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Enter") return void confirmPage();
      if (event.key === " ") return toggle(cursor);
      // Up/down move a ROW, and the row width is now whatever fits the screen — measured, not
      // assumed, or the arrows jump a different distance than the eye sees.
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[event.key]!;
      setCursor((c) => Math.max(0, Math.min(slice.length - 1, c + delta)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cols, confirmPage, cursor, slice.length, toggle]);

  if (emptied) {
    return (
      <div className="rounded-lg border border-green-600 bg-green-950/40 p-4 text-sm">
        <strong>Bucket leer ✓</strong> — alle {cells.length} Zellen entschieden
.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <strong>
          {kind === "confirm" ? "pre-label: occluded" : "pre-label: keep the FEN label"}
        </strong>
        <span className="text-muted-foreground">
          {remaining.length} Zellen offen von {cells.length} · page {safePage + 1}/{pages} ·{" "}
          {marked.size} exceptions
          <span className="hidden sm:inline">
            {" "}· <kbd>Enter</kbd> confirms the page, <kbd>Space</kbd>/click marks an exception,
            arrows move
          </span>
        </span>
        <Button className={`ml-auto ${TOUCH}`} onClick={() => void confirmPage()} size="sm">
          {kind === "confirm" ? `confirm ${slice.length - marked.size} as occluded` : "checked"}
        </Button>
      </div>
      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}

      <CropGrid
        cells={slice.map((cell) => ({
          key: keyOf(cell),
          src: `/api/cell/${name}/${cell.frame}/${cell.square}?size=${CROP}`,
          alt: `${cell.square} @ ${cell.frame}`,
          caption: `${cell.square} ${cell.score.toFixed(2)}`,
        }))}
        cursor={cursor}
        marked={marked}
        onColumns={setCols}
        onPick={(i) => {
          setCursor(i);
          toggle(i);
        }}
      />

      <div className="flex gap-2">
        <Button
          className={TOUCH}
          disabled={safePage === 0}
          onClick={() => setPage(Math.max(0, safePage - 1))}
          size="sm"
          variant="outline"
        >
          previous page
        </Button>
        <Button
          className={TOUCH}
          disabled={safePage + 1 >= pages}
          onClick={() => setPage(safePage + 1)}
          size="sm"
          variant="outline"
        >
          skip page
        </Button>
      </div>
    </div>
  );
}
