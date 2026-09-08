"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { verifyFrameKey } from "@/lib/position-carry";
import type { VerifyFrame, VerifySession } from "@/lib/verify";

/** Zehn Bretter auf einen Blick. Mehr passt bei 320 px nicht mehr nebeneinander, weniger macht
 *  aus dem Raster wieder eine Einzelansicht. Die Ziffernreihe reicht genau bis hierher. */
export const MATTE_PAGE = 10;

/** The tile size the board and its alpha are fetched at — both must ask for the SAME raster. */
const TILE = 360;

export type MatteGridProps = {
  frames: VerifyFrame[];
  sessions: VerifySession[];
  marked: ReadonlySet<string>;
  alpha: boolean;
  onToggle: (key: string) => void;
  onOpen: (key: string) => void;
};

/**
 * Das Raster ist die Regel, die Einzelansicht die Ausnahme: SAMs Schnitt stimmt meistens, also
 * kostet er einen Blick und keinen Klick. Markiert wird, was NICHT passt — ⏎ schreibt dann die
 * ganze Seite, `matte-ok` fuer alles Unmarkierte und `matte-bad` fuer den Rest.
 */
export function MatteGrid({ frames, sessions, marked, alpha, onToggle, onOpen }: MatteGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {frames.map((frame, i) => {
        const key = verifyFrameKey(frame);
        const session = sessions[frame.session];
        const on = marked.has(key);
        return (
          <div
            className={`relative overflow-hidden rounded-lg border ${
              on ? "border-amber-500 bg-amber-500/10" : "border-border"
            }`}
            key={key}
          >
            <button
              aria-label={`${frame.stem} ${on ? "wieder gut" : "taugt nichts"}`}
              aria-pressed={on}
              className="relative block aspect-square w-full cursor-pointer"
              onClick={() => onToggle(key)}
              type="button"
            >
              <Image
                alt={`board ${frame.stem}`}
                className="object-contain"
                fill
                sizes={`${TILE}px`}
                src={`/api/board/${session.name}/${frame.stem}?size=${TILE}`}
                unoptimized
              />
              {alpha ? (
                <Image
                  alt={`alpha ${frame.stem}`}
                  className="pointer-events-none object-contain opacity-70 mix-blend-screen"
                  fill
                  sizes={`${TILE}px`}
                  src={`/api/matte/${session.name}/${frame.stem}?size=${TILE}`}
                  unoptimized
                />
              ) : null}
              <span className="bg-background/80 text-muted-foreground absolute top-1 left-1 rounded px-1 font-mono text-[10px] tabular-nums">
                {(i + 1) % 10}
              </span>
              {on ? (
                <span className="absolute inset-0 flex items-center justify-center text-3xl text-amber-400">✕</span>
              ) : null}
            </button>
            <div className="flex items-center gap-1 px-1.5 py-1 text-[10px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground truncate font-mono">
                    ply {frame.ply} · {frame.covered.length} F
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {session.sessionId} · {frame.stem}
                  {frame.reason ? ` · ${frame.reason}` : ""} ·{" "}
                  {frame.covered.join(" ") || "kein Feld über der Schwelle"}
                </TooltipContent>
              </Tooltip>
              {frame.alpha === "sam" ? null : (
                <span className={frame.alpha === "pending" ? "text-amber-400" : "text-green-400"}>✎</span>
              )}
              <Button
                className="ml-auto h-6 px-1.5 text-[10px]"
                onClick={() => onOpen(key)}
                size="sm"
                variant="ghost"
              >
                Pinsel
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
