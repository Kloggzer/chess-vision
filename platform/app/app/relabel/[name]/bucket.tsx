"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/proposals";
import { writeRows } from "./write";

const PAGE = 60;
const COLS = 10;
const CROP = 96;

export type BucketProps = {
  name: string;
  sessionId: string;
  cells: Proposal[];
  /** `confirm` writes one row per crop; `control` is the pre-label CHECK and writes nothing. */
  kind: "confirm" | "control";
  decided: Record<string, string>;
  onException: (cells: Proposal[]) => void;
  onWritten: (n: number) => void;
  onError: (error: unknown) => void;
  /** Fired once when the LAST page is confirmed — the session-done banner listens. */
  onDone?: () => void;
};

const keyOf = (c: Proposal) => `${c.frame}|${c.square}`;

/**
 * Verification labeling: one page, one pre-label, ONE keypress. Clicks are for exceptions —
 * they leave the page for the tinder band, where they get looked at one at a time.
 *
 * The bucket EMPTIES, and it stays emptied across a reload: both kinds record what was decided,
 * `confirm` into corrections.jsonl and `control` into reviewed.jsonl (see `lib/corrections.ts` for
 * why those are two files). "Am I done?" is answered by the grid itself.
 */
export function BucketGrid(props: BucketProps) {
  const { name, sessionId, cells, kind, decided, onException, onWritten, onError, onDone } = props;
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  // Grouped BY SQUARE, not by score. 406 proposals on this session stand on 63 distinct squares
  // and 810 on 61 — score order scatters a square's six crops across six pages, so the grid felt
  // like it kept showing the same pictures ("ich sehe immer noch alte Bilder und wiederholende
  // Bilder", 2026-08-09). Contiguous, a page is a handful of squares seen at a few moments each,
  // which is one judgement per group instead of six identical-looking ones far apart.
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
      const written = await writeRows(rows, kind === "confirm" ? "corrections" : "reviewed");
      onWritten(written);
      onException(exceptions);
      setNote(
        kind === "confirm"
          ? `${written} rows written, ${exceptions.length} to the tinder band`
          : `${written} cells recorded as reviewed (not a training row — the FEN was already ` +
            `right); ${exceptions.length} to the tinder band`,
      );
      // The whole page leaves the bucket — accepted as decided, exceptions to the tinder band.
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
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS }[event.key]!;
      setCursor((c) => Math.max(0, Math.min(slice.length - 1, c + delta)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmPage, cursor, slice.length, toggle]);

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
          {remaining.length} offen von {cells.length} · page {safePage + 1}/{pages} ·{" "}
          {marked.size} exceptions · <kbd>Enter</kbd> confirms the page, <kbd>Space</kbd>/click
          marks an exception, arrows move
        </span>
        <Button className="ml-auto" onClick={() => void confirmPage()} size="sm">
          {kind === "confirm" ? `confirm ${slice.length - marked.size} as occluded` : "checked"}
        </Button>
      </div>
      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {slice.map((cell, i) => (
          <div
            className={`relative cursor-pointer overflow-hidden rounded border-2 ${
              marked.has(i) ? "border-amber-500" : "border-transparent"
            } ${i === cursor ? "ring-primary ring-2" : ""}`}
            key={keyOf(cell)}
            onClick={() => {
              setCursor(i);
              toggle(i);
            }}
            role="button"
            tabIndex={-1}
          >
            <Image
              alt={`${cell.square} @ ${cell.frame}`}
              height={CROP}
              src={`/api/cell/${name}/${cell.frame}/${cell.square}?size=${CROP}`}
              unoptimized
              width={CROP}
            />
            <span className="bg-background/70 absolute bottom-0 left-0 px-1 font-mono text-[10px]">
              {cell.square} {cell.score.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          disabled={safePage === 0}
          onClick={() => setPage(Math.max(0, safePage - 1))}
          size="sm"
          variant="outline"
        >
          previous page
        </Button>
        <Button
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
