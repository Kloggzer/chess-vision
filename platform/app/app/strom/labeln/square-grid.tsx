"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CROP, CropGrid } from "@/components/crop-grid";
import type { StreamCell } from "@/lib/label-stream";
import type { Flush } from "./stream";

export type SquareGridProps = {
  name: string;
  sessionId: string;
  square: string;
  cells: StreamCell[];
  decided: Record<string, string>;
  onFlush: Flush;
  onClose: () => void;
};

/**
 * `Shift+Space` — one square across every frame the producer flagged it on.
 *
 * The board answers "which cells are covered here"; this answers "is this square ever covered",
 * which is the question a leaning piece or a resting hand makes cheap to get wrong one frame at a
 * time.
 */
export function SquareGrid({ name, sessionId, square, cells, decided, onFlush, onClose }: SquareGridProps) {
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [cursor, setCursor] = useState(0);
  const open = useMemo(
    () => cells.filter((c) => decided[`${c.stem}|${c.square}`] === undefined).sort((a, b) => a.stem.localeCompare(b.stem)),
    [cells, decided],
  );

  async function accept() {
    const taken = open.filter((_, i) => !marked.has(i));
    const rows = taken.map((c) => ({ session_id: sessionId, frame: c.stem, square: c.square, label: "occluded" }));
    const before = Object.fromEntries(
      taken.map((c) => [`${sessionId}|${c.stem}|${c.square}`, decided[`${c.stem}|${c.square}`]]),
    );
    await onFlush(open[0]?.pos ?? 0, [{ rows, ledger: "corrections" }], before);
    onClose();
  }

  return (
    <div className="bg-background/95 fixed inset-0 z-40 overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">
            {square} · {name}
          </span>
          <span className="text-muted-foreground">
            {open.length} offene Frames · markierte bleiben offen
          </span>
          <Button className="max-sm:h-11" disabled={open.length === 0} onClick={() => void accept()} size="sm">
            {open.length - marked.size} als occluded
          </Button>
          <Button className="ml-auto max-sm:h-11" onClick={onClose} size="sm" variant="outline">
            Esc zurück
          </Button>
        </div>
        {open.length === 0 ? (
          <p className="text-muted-foreground text-sm">Für {square} ist nichts mehr offen.</p>
        ) : (
          <CropGrid
            cells={open.map((cell) => ({
              key: `${cell.stem}|${cell.square}`,
              src: `/api/cell/${name}/${cell.stem}/${cell.square}?size=${CROP}`,
              alt: `${cell.square} @ ${cell.stem}`,
              caption: `${cell.stem} ${cell.score.toFixed(2)}`,
            }))}
            cursor={cursor}
            marked={marked}
            onPick={(i) => {
              setCursor(i);
              setMarked((m) => {
                const next = new Set(m);
                if (!next.delete(i)) next.add(i);
                return next;
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
