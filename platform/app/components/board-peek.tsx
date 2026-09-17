"use client";

import { SQUARES } from "@/components/board-paint";
import type { HandOverlay } from "@/lib/hand-overlay";

export type BoardPeekProps = {
  /** The rectified board this cell was cut from — `/api/board/<name>/<stem>`. */
  src: string;
  /** Which square to ring, in `SQUARES` spelling. */
  square: string;
  /** Printed over the board so the panel says what it is showing. */
  caption: string;
  /** Die verdeckten Felder UND woher sie kommen: die Matte misst, der Rillen-Sensor nennt nur
   *  (Recall 71 %). Das zu verschweigen liess halbe Haende wie ganze aussehen. */
  hands?: HandOverlay;
};

const SIZE = 384;

/**
 * The whole board behind one cell, while the magnifier is on. FIXED to a corner and NOT following
 * the pointer — a panel under the cursor covers the cells the eye is crossing, which is why the
 * per-cell tooltip left the brush (2026-08-16).
 */
export function BoardPeek({ src, square, caption, hands }: BoardPeekProps) {
  const at = SQUARES.indexOf(square);
  const covered = new Set(hands?.squares ?? []);
  return (
    <div className="border-border bg-background/95 pointer-events-none fixed right-4 bottom-4 z-50 rounded-lg border p-2 shadow-xl backdrop-blur">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- one board, sized by the panel */}
        <img alt={`Brett zu ${square}`} className="h-full w-full rounded" src={src} />
        {at >= 0 ? (
          <div className="absolute inset-0 grid grid-cols-8">
            {SQUARES.map((sq, i) => (
              <div
                // Das gefragte Feld gewinnt den Ring: die Hand ist Kontext, nicht die Frage.
                className={
                  i === at
                    ? "ring-primary ring-2 ring-inset"
                    : covered.has(sq)
                      ? "bg-amber-400/30 ring-1 ring-amber-400/70 ring-inset"
                      : ""
                }
                key={sq}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-muted-foreground mt-1 text-center font-mono text-xs">
        {caption}
        {hands && hands.source !== "none" ? (
          <span className={hands.source === "matte" ? "ml-2 text-amber-300" : "ml-2 text-amber-500/70"}>
            {hands.source === "matte" ? "Matte" : "nur Rillen (~71 %)"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
