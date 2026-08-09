"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Correction } from "@/lib/corrections";
import { FILES, fenLabels } from "@/lib/fen";
import { writeRows } from "./write";

export type FrameInfo = { stem: string; ply: number; fen: string };
export type DrilldownProps = {
  name: string;
  sessionId: string;
  frames: FrameInfo[];
  decided: Record<string, string>;
  onWritten: (n: number) => void;
  onError: (error: unknown) => void;
  /** Squares the active filter hit on each frame — outlined, so the eye starts where the work is. */
  hits?: Record<string, string[]>;
  /** Where the queue came from, for the header line. */
  queueNote?: string;
};

const SQUARES = Array.from({ length: 64 }, (_, i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`);
/** `{stem: {square: label}}` — per frame, so stepping to the next one resets nothing. */
type ByFrame = Record<string, Record<string, string>>;

/**
 * The rectified board with an 8x8 overlay. An occluder covers a CONTIGUOUS swath, so the primary
 * gesture is a BRUSH: pointer-down and drag marks every cell the pointer enters `occluded`, the
 * eraser (or the right button) puts the FEN label back. A click without a drag keeps the cycle.
 *
 * Pointer-enter bookkeeping over plain divs — one entered cell is one state update, no canvas.
 */
export function Drilldown(props: DrilldownProps) {
  const { name, sessionId, frames, decided, onWritten, onError, hits, queueNote } = props;
  const [at, setAt] = useState(0);
  const [eraser, setEraser] = useState(false);
  const [edits, setEdits] = useState<ByFrame>({});
  /** What already left through the writer — the baseline the unsaved diff is measured against. */
  const [saved, setSaved] = useState<ByFrame>({});

  const frame = frames[at];
  const stem = frame?.stem ?? "";
  const fen = useMemo(() => fenLabels(frame?.fen ?? ""), [frame]);
  const base = useMemo(() => {
    const out: Record<string, string> = {};
    for (const sq of SQUARES) out[sq] = decided[`${stem}|${sq}`] ?? fen[sq];
    return out;
  }, [decided, fen, stem]);

  const labels = useMemo(() => ({ ...base, ...edits[stem] }), [base, edits, stem]);
  const pending: Correction[] = useMemo(
    () =>
      SQUARES.filter((sq) => labels[sq] !== (saved[stem]?.[sq] ?? base[sq])).map((sq) => ({
        session_id: sessionId,
        frame: stem,
        square: sq,
        label: labels[sq],
      })),
    [labels, saved, base, stem, sessionId],
  );

  const flush = useCallback(
    async (rows: Correction[]) => {
      if (rows.length === 0) return;
      try {
        onWritten(await writeRows(rows));
        const written = Object.fromEntries(rows.map((r) => [r.square, r.label]));
        setSaved((s) => ({ ...s, [rows[0].frame]: { ...s[rows[0].frame], ...written } }));
      } catch (error) {
        onError(error);
      }
    },
    [onWritten, onError],
  );

  // Writes on navigate-away, including leaving the view: an unmount cleanup cannot read state,
  // so the two moving parts are mirrored into refs from an effect (never during render).
  const latest = useRef<Correction[]>([]);
  const flushRef = useRef(flush);
  useEffect(() => {
    latest.current = pending;
    flushRef.current = flush;
  }, [pending, flush]);
  useEffect(() => () => void flushRef.current(latest.current), []);

  const set = (square: string, label: string) =>
    setEdits((e) => ({ ...e, [stem]: { ...e[stem], [square]: label } }));

  const paint = (square: string, erase: boolean) => set(square, erase ? fen[square] : "occluded");
  const cycle = (square: string) => {
    const order = [fen[square], "occluded", "empty"];
    set(square, order[(order.indexOf(labels[square]) + 1) % order.length]);
  };

  const painting = useRef<{ start: string; erase: boolean; dragged: boolean } | null>(null);

  function enter(square: string) {
    const state = painting.current;
    if (!state) return;
    if (!state.dragged) {
      if (state.start === square) return; // still inside the cell the press started in
      state.dragged = true;
      paint(state.start, state.erase);
    }
    paint(square, state.erase);
  }

  function up() {
    const state = painting.current;
    painting.current = null;
    if (state && !state.dragged) cycle(state.start);
  }

  async function go(delta: number) {
    await flush(pending);
    setAt((i) => Math.max(0, Math.min(frames.length - 1, i + delta)));
  }

  if (!frame) return <p className="text-muted-foreground text-sm">No proposal frames.</p>;

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="font-mono">
          frame {stem} · ply {frame.ply} · {at + 1}/{frames.length}
          {queueNote ? ` · ${queueNote}` : ""}
        </span>
        <Button disabled={at === 0} onClick={() => void go(-1)} size="sm" variant="outline">
          previous
        </Button>
        <Button
          disabled={at + 1 >= frames.length}
          onClick={() => void go(1)}
          size="sm"
          variant="outline"
        >
          next
        </Button>
        <Button
          onClick={() => setEraser((e) => !e)}
          size="sm"
          variant={eraser ? "default" : "outline"}
        >
          {eraser ? "eraser ON" : "brush (paints occluded)"}
        </Button>
        <span className="text-muted-foreground">
          drag paints · right button erases · click cycles FEN → occluded → empty
        </span>
        <Button
          className="ml-auto"
          disabled={pending.length === 0}
          onClick={() => void flush(pending)}
          size="sm"
        >
          write {pending.length} cells
        </Button>
      </div>

      <div
        className="relative mx-auto aspect-square w-full max-w-[720px] select-none"
        onContextMenu={(event) => event.preventDefault()}
        onPointerLeave={up}
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
        <Image
          alt={`board ${stem}`}
          className="object-contain"
          fill
          sizes="720px"
          src={`/api/board/${name}/${stem}?size=720`}
          unoptimized
        />
        <div className="absolute inset-0 grid grid-cols-8">
          {SQUARES.map((sq) => {
            const label = labels[sq];
            const tint =
              label === "occluded"
                ? "bg-amber-500/45"
                : label !== fen[sq]
                  ? "bg-sky-500/40"
                  : "hover:bg-white/10";
            // What the filter flagged, before you touch anything — an outline, never a label:
            // the model asks the question, the brush answers it.
            const flagged = hits?.[stem]?.includes(sq)
              ? "outline outline-2 -outline-offset-2 outline-fuchsia-400"
              : "";
            return (
              <div
                className={`border border-white/10 ${tint} ${flagged}`}
                key={sq}
                onPointerDown={(event) => {
                  painting.current = {
                    start: sq,
                    erase: eraser || event.button === 2,
                    dragged: false,
                  };
                }}
                onPointerEnter={() => enter(sq)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
