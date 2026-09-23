"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { SQUARES as BOARD_SQUARES } from "@/components/board-paint";
import { STREAM_PALETTE } from "@/components/board-paint";
import { CROP } from "@/components/crop-grid";
import type { Correction, Ledger } from "@/lib/session-store/corrections";
import type { StreamSession } from "@/lib/label/label-stream";
import { collapseEvents, groupBySquare, type LaneCell } from "@/lib/label/lanes";
import type { Tally } from "@/lib/label/session-tally";
import type { Flush, LaneActions } from "./stream";

export type MobileSortProps = {
  cells: LaneCell[];
  sessions: StreamSession[];
  decided: Record<string, string>[];
  /** Auch die schon beurteilten Zellen zeigen — die Nachkorrektur des Stroms. */
  showDone: boolean;
  tally: Tally;
  actionsRef: RefObject<LaneActions>;
  onFlush: Flush;
  onUndo: () => void;
  onThrow: () => void;
};

/** Swipe distance that counts as a verdict rather than a scroll. */
const SWIPE = 60;
/** A finger has to rest this long before a bucket answers for the whole event. */
const HOLD_MS = 450;

type Bucket = { label: string; write: string; ledger: Ledger };
const BUCKETS: Bucket[] = [
  { label: "FEN stimmt", write: "", ledger: "reviewed" },
  { label: "leer", write: "empty", ledger: "corrections" },
];

/**
 * The phone mode (CONCEPT.md §4.3): one crop, four big buckets, a swipe per verdict.
 *
 * It inherits the two properties that killed the tinder band without them — grouping BY SQUARE and
 * EVENT COLLAPSE. A resting hand produces forty identical cards otherwise, and the answer to forty
 * identical cards is one long press, not forty taps.
 */
export function MobileSort({ cells, sessions, decided, showDone, tally, actionsRef, onFlush, onUndo, onThrow }: MobileSortProps) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set<string>());
  const [palette, setPalette] = useState(false);
  const [board, setBoard] = useState(false);
  // Same as the grid's: a card whose crop 404s must not be judged as a dark square (2026-09-07).
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set<string>());
  const touch = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** What ⟲ has to put back — the whole group when a long press answered for it. */
  const last = useRef<{ keys: string[]; wrote: boolean } | null>(null);

  const keyOf = (c: LaneCell) => `${c.session}|${c.stem}|${c.square}`;
  const groups = useMemo(() => {
    const open = groupBySquare(
      cells.filter(
        (c) =>
          (showDone || (decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined) &&
          !done.has(keyOf(c)),
      ),
    );
    return collapseEvents(open);
  }, [cells, decided, done, showDone]);

  const group = groups[0];
  const head = group?.head;
  const cropSrc = head ? `/api/cell/${sessions[head.session].name}/${head.stem}/${head.square}?size=512` : "";

  const answer = useCallback(
    async (label: string, ledger: Ledger, whole: boolean) => {
      if (!group) return;
      const picked = whole ? group.members : [group.head];
      const rows: Correction[] = picked.map((c) => ({
        session_id: sessions[c.session].sessionId,
        frame: c.stem,
        square: c.square,
        label: label === "" ? c.fen_label : label,
      }));
      const before = Object.fromEntries(
        picked.map((c) => [
          `${sessions[c.session].sessionId}|${c.stem}|${c.square}`,
          (decided[c.session] ?? {})[`${c.stem}|${c.square}`],
        ]),
      );
      // Erst schreiben, dann wegwischen: die Karte blieb sonst nach einem gescheiterten POST
      // weg, und `undo` haette eine Zeile zurueckgenommen, die es nie gab.
      if (!(await onFlush(group.head.pos, [{ rows, ledger }], before))) return;
      last.current = { keys: picked.map(keyOf), wrote: true };
      setDone((d) => new Set([...d, ...picked.map(keyOf)]));
      setPalette(false);
    },
    [decided, group, onFlush, sessions],
  );

  /** Swipe down = skip: no row, and the crop comes back on the next load. */
  const skip = useCallback(() => {
    if (!group) return;
    last.current = { keys: [keyOf(group.head)], wrote: false };
    setDone((d) => new Set([...d, keyOf(group.head)]));
  }, [group]);

  const undo = useCallback(() => {
    const step = last.current;
    last.current = null;
    if (step) setDone((d) => new Set([...d].filter((k) => !step.keys.includes(k))));
    if (step?.wrote !== false) onUndo();
  }, [onUndo]);

  const now = useRef({ answer, skip });
  useEffect(() => {
    now.current = { answer, skip };
  });
  useEffect(() => {
    actionsRef.current = {
      commit: () => void now.current.answer("", "reviewed", false),
      reject: () => void now.current.answer("", "reviewed", false),
      brush: (label) => void now.current.answer(label, "corrections", false),
      undo: () => false,
    };
  }, [actionsRef]);

  function press(bucket: Bucket) {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      void answer(bucket.write, bucket.ledger, true);
    }, HOLD_MS);
  }
  function release(bucket: Bucket) {
    if (timer.current) clearTimeout(timer.current);
    if (held.current) return;
    void answer(bucket.write, bucket.ledger, false);
  }

  if (!head || !group) {
    return <p className="text-muted-foreground text-sm">Nichts mehr offen — die Lane ist durch.</p>;
  }

  const session = sessions[head.session];
  const boardSrc = `/api/board/${session.name}/${head.stem}?size=512`;
  const standing = (decided[head.session] ?? {})[`${head.stem}|${head.square}`];
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-baseline gap-2 font-mono text-[11px]">
          <span className="text-foreground text-sm">{head.square}</span>
          <span>{head.stem}</span>
          <span className="ml-auto truncate">{session.sessionId}</span>
        </div>
        <div className="flex items-baseline gap-4 text-sm">
          <span>
            <span className="text-muted-foreground text-[11px]">soll </span>
            <span className="font-mono">{head.fen_label}</span>
          </span>
          <span>
            <span className="text-muted-foreground text-[11px]">Modell </span>
            <span className="font-mono text-amber-300">{head.exception ?? "—"}</span>
          </span>
          {standing ? <span className="font-mono text-fuchsia-300">✓ {standing}</span> : null}
        </div>
        {head.note ? <p className="text-amber-300/90 text-xs">{head.note}</p> : null}
      </div>
      {group.members.length > 1 ? (
        <p className="text-xs text-fuchsia-300">⟨ gleiches Ereignis: {group.members.length} ⟩</p>
      ) : null}

      <div
        className="relative mx-auto aspect-square w-full max-w-[351px] overflow-hidden rounded"
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > Math.abs(dy) && dx < -SWIPE) void answer("", "reviewed", false);
          else if (dy > SWIPE) skip();
        }}
        onTouchStart={(event) => {
          touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }}
      >
        {board && broken.has(boardSrc) ? (
          <div className="border-destructive/60 bg-destructive/10 text-destructive flex h-full w-full items-center justify-center border p-3 text-center font-mono text-sm">
            Brett fehlt — {head.stem}
          </div>
        ) : board ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- ein Brett, vom Server skaliert */}
            <img
              alt={`Brett zu ${head.square}`}
              className="h-full w-full"
              onError={() => setBroken((was) => new Set(was).add(boardSrc))}
              src={boardSrc}
            />
            <div className="pointer-events-none absolute inset-0 grid grid-cols-8">
              {BOARD_SQUARES.map((sq: string) => (
                <div className={sq === head.square ? "ring-2 ring-fuchsia-400 ring-inset" : ""} key={sq} />
              ))}
            </div>
          </>
        ) : broken.has(cropSrc) ? (
          <div className="border-destructive/60 bg-destructive/10 text-destructive flex h-full w-full items-center justify-center border p-3 text-center font-mono text-sm">
            Crop fehlt — {head.square} @ {head.stem}
          </div>
        ) : (
          <Image
            alt={`${head.square} @ ${head.stem}`}
            className="h-full w-full object-cover"
            height={CROP}
            onError={() => setBroken((was) => new Set(was).add(cropSrc))}
            priority
            src={cropSrc}
            unoptimized
            width={CROP}
          />
        )}
      </div>
      <p className="text-muted-foreground text-center text-[11px]">
        ← FEN stimmt · ↓ überspringen · lange drücken = ganzes Ereignis
      </p>

      <div className="grid grid-cols-2 gap-2">
        {BUCKETS.map((bucket) => (
          <Button
            className="h-[88px] text-base"
            key={bucket.label}
            onPointerCancel={() => timer.current && clearTimeout(timer.current)}
            onPointerDown={() => press(bucket)}
            onPointerUp={() => release(bucket)}
            variant={bucket.ledger === "reviewed" ? "default" : "outline"}
          >
            {bucket.label}
          </Button>
        ))}
        <Button className="h-[88px] text-base" onClick={() => setBoard(!board)} variant="outline">
          {board ? "Brett aus" : "Brett"}
        </Button>
        <Button className="h-[88px] text-base" onClick={() => setPalette(!palette)} variant="outline">
          andere ▸
        </Button>
      </div>

      {palette ? (
        <div className="flex flex-wrap gap-2">
          {STREAM_PALETTE.map(([, label]) => (
            <Button
              className="h-11"
              key={label}
              onClick={() => void answer(label, "corrections", false)}
              size="sm"
              variant="outline"
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="bg-background/95 sticky bottom-0 z-10 flex items-center gap-2 py-2 text-sm backdrop-blur">
        <Button className="h-11" onClick={undo} variant="outline">
          ⟲ zurück
        </Button>
        <Button className="h-11" onClick={onThrow} variant="destructive">
          ✕ raus
        </Button>
        <span className="text-muted-foreground ml-auto tabular-nums">
          {tally.cellsConfirmed + tally.piecesCorrected} heute
        </span>
      </div>
    </div>
  );
}
