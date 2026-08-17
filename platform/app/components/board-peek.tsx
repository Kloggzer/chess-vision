"use client";

import { SQUARES } from "@/components/board-paint";

export type BoardPeekProps = {
  /** The rectified board this cell was cut from — `/api/board/<name>/<stem>`. */
  src: string;
  /** Which square to ring, in `SQUARES` spelling. */
  square: string;
  /** Printed over the board so the panel says what it is showing. */
  caption: string;
};

const SIZE = 384;

/**
 * The whole board behind one cell, while the magnifier is on. FIXED to a corner and NOT following
 * the pointer — a panel under the cursor covers the cells the eye is crossing, which is why the
 * per-cell tooltip left the brush (2026-08-16).
 */
export function BoardPeek({ src, square, caption }: BoardPeekProps) {
  const at = SQUARES.indexOf(square);
  return (
    <div className="border-border bg-background/95 pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border p-2 shadow-xl backdrop-blur">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- one board, sized by the panel */}
        <img alt={`Brett zu ${square}`} className="h-full w-full rounded" src={src} />
        {at >= 0 ? (
          <div className="absolute inset-0 grid grid-cols-8">
            {SQUARES.map((sq, i) => (
              <div
                className={i === at ? "ring-primary ring-2 ring-inset" : ""}
                key={sq}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-muted-foreground mt-1 text-center font-mono text-xs">{caption}</div>
    </div>
  );
}
