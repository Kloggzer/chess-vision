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

/**
 * Verification labeling: one page, one pre-label, ONE keypress. Clicks are for exceptions —
 * they leave the page for the tinder band, where they get looked at one at a time.
 */
export function BucketGrid(props: BucketProps) {
  const { name, sessionId, cells, kind, decided, onException, onWritten, onError } = props;
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");

  const pages = Math.max(1, Math.ceil(cells.length / PAGE));
  const slice = useMemo(() => cells.slice(page * PAGE, page * PAGE + PAGE), [cells, page]);

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
      const written =
        kind === "confirm"
          ? await writeRows(
              accepted.map((c) => ({
                session_id: sessionId,
                frame: c.frame,
                square: c.square,
                label: "occluded",
              })),
            )
          : 0;
      onWritten(written);
      onException(exceptions);
      setNote(
        kind === "confirm"
          ? `page ${page + 1}: ${written} rows written, ${exceptions.length} to the tinder band`
          : `page ${page + 1}: control stream — the FEN already labels these, nothing written; ` +
            `${exceptions.length} to the tinder band`,
      );
      setMarked(new Set());
      setCursor(0);
      if (page + 1 >= pages) props.onDone?.();
      setPage((p) => Math.min(p + 1, pages - 1));
    } catch (error) {
      onError(error);
    }
  }, [slice, marked, kind, sessionId, page, pages, onException, onWritten, onError, props]);

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

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <strong>
          {kind === "confirm" ? "pre-label: occluded" : "pre-label: keep the FEN label"}
        </strong>
        <span className="text-muted-foreground">
          page {page + 1}/{pages} · {slice.length} crops · {marked.size} exceptions ·{" "}
          <kbd>Enter</kbd> confirms the page, <kbd>Space</kbd>/click marks an exception, arrows move
        </span>
        <Button className="ml-auto" onClick={() => void confirmPage()} size="sm">
          {kind === "confirm" ? `confirm ${slice.length - marked.size} as occluded` : "checked"}
        </Button>
      </div>
      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {slice.map((cell, i) => {
          const key = `${cell.frame}|${cell.square}`;
          return (
            <div
              className={`relative cursor-pointer overflow-hidden rounded border-2 ${
                marked.has(i) ? "border-amber-500" : "border-transparent"
              } ${i === cursor ? "ring-primary ring-2" : ""}`}
              key={key}
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
                {decided[key] ? " ✓" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)} size="sm" variant="outline">
          previous page
        </Button>
        <Button
          disabled={page + 1 >= pages}
          onClick={() => setPage((p) => p + 1)}
          size="sm"
          variant="outline"
        >
          skip page
        </Button>
      </div>
    </div>
  );
}
