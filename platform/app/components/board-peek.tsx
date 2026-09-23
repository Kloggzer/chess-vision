"use client";

import { SquareRing } from "@/components/square-ring";
import type { MatteOverlay } from "@/lib/label/hand-overlay";

export type BoardPeekProps = {
  /** The rectified board this cell was cut from — `/api/board/<name>/<stem>`. */
  src: string;
  /** Which square to ring, in `SQUARES` spelling. */
  square: string;
  /** Printed over the board so the panel says what it is showing. */
  caption: string;
  /** Die Verdeckung der MATTE-LANE, in ihrer eigenen Form. Kaesten je Feld liessen einen Finger
   *  wie einen Block aussehen, und der Rillen-Sensor darunter zeigte nur die Haelfte davon. */
  matte?: MatteOverlay;
};

const SIZE = 384;

/**
 * The whole board behind one cell, while the magnifier is on. FIXED to a corner and NOT following
 * the pointer — a panel under the cursor covers the cells the eye is crossing, which is why the
 * per-cell tooltip left the brush (2026-08-16).
 */
export function BoardPeek({ src, square, caption, matte }: BoardPeekProps) {
  return (
    <div className="border-border bg-background/95 pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border p-2 shadow-xl backdrop-blur">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- one board, sized by the panel */}
        <img alt={`Brett zu ${square}`} className="h-full w-full rounded" src={src} />
        {matte?.src ? (
          // Dieselbe Darstellung wie in der Matte-Lane (`app/strom/matte/frame.tsx`), damit ein
          // Alpha hier und dort gleich aussieht und niemand zwei Bilder vergleichen muss.
          // eslint-disable-next-line @next/next/no-img-element -- one alpha, sized by the panel
          <img
            alt={`Matte zu ${square}`}
            className="pointer-events-none absolute inset-0 h-full w-full rounded opacity-70 mix-blend-screen"
            src={matte.src}
          />
        ) : null}
        <SquareRing ring="ring-primary ring-2 ring-inset" square={square} />
      </div>
      <div className="text-muted-foreground mt-1 text-center font-mono text-xs">
        {caption}
        {matte ? (
          <span className={matte.measured ? "ml-2 text-amber-300" : "ml-2 text-red-400"}>
            {matte.measured ? `Matte · ${matte.covered} verdeckt` : "keine Matte — ungemessen"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
