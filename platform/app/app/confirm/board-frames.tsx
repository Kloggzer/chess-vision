"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  boostFilter,
  COMPARE_OFF,
  SquareLoupe,
  useBlink,
  type CompareView,
} from "@/app/confirm/compare";
import type { FrameStem } from "@/lib/data";
import type { MoveSquares, ReviewCard } from "@/lib/review-cards";

/**
 * The commit picture and its pager, shared by the confirm page and the ZÜGE stream.
 *
 * Extracted unchanged when the stream landed (CONCEPT.md §4.1): the two surfaces ask the SAME
 * question of the same window, and a second copy of the overlay geometry is the copy that drifts.
 */

/** What a click on a picture opens full-screen. */
export type Zoom = {
  stem: string;
  width: number;
  height: number;
  squares: MoveSquares[];
  /** Das Bild VOR dem Zug — auch gross bleibt der Vergleich die einzige Art zu pruefen. */
  before: FrameStem | null;
};

/**
 * Die beiden Frames uebereinander: nachher liegt unten, vorher darueber. Was die Deckschicht
 * tut, entscheidet das Fenster — ueberblenden bei Mausberuehrung, blinken, oder als Differenz
 * stehen bleiben, wo nur die geaenderten Felder leuchten.
 */
function ComparePair({
  name,
  after,
  before,
  view,
  hover,
  priority = false,
}: {
  name: string;
  after: FrameStem;
  before: FrameStem | null;
  view: CompareView;
  hover: boolean;
  priority?: boolean;
}) {
  const armed = before !== null && view.mode !== "off";
  const blinkOn = useBlink(armed && view.mode === "blink" && hover);
  const diffing = armed && view.mode === "diff" && !hover;
  const shown =
    view.mode === "fade"
      ? hover
      : view.mode === "blink"
        ? blinkOn && hover
        : diffing;
  return (
    <span
      className="absolute inset-0 block transition-[filter] duration-150"
      style={{ filter: boostFilter(view, diffing) }}
    >
      <Image
        alt={`frame ${after.stem}`}
        className="object-contain"
        fill
        priority={priority}
        sizes="(min-width: 768px) 45vw, 90vw"
        src={`/api/frame/${name}/${after.stem}`}
        unoptimized
      />
      {armed && before ? (
        <Image
          alt=""
          className="object-contain transition-opacity duration-150"
          fill
          sizes="(min-width: 768px) 45vw, 90vw"
          src={`/api/frame/${name}/${before.stem}`}
          style={{
            mixBlendMode: diffing ? "difference" : "normal",
            opacity: armed && shown ? 1 : 0,
            transitionDuration: view.mode === "blink" ? "0ms" : undefined,
          }}
          unoptimized
        />
      ) : null}
    </span>
  );
}

/**
 * The claimed move(s), drawn ONTO the rectified board so the human answers yes/no by looking.
 * The board is the image's top [width] x [width] with a8 at the top-left — square on a bare
 * board, and the same 8x8 grid above the strip on an older 720x816 burst PNG.
 * A multi-commit draws every half of the sequence — the picture shows the end of all of them.
 */
function MoveOverlay({
  squares,
  width = 720,
  height = 816,
}: {
  squares: MoveSquares[];
  width?: number;
  height?: number;
}) {
  /** One marker per overlay instance — several cards draw arrows on the same page. React's id
   *  carries punctuation that has no business inside a `url(#…)`, so only the letters survive. */
  const markerId = `arrow${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const cell = width / 8;
  const pos = (sq: string) => ({
    x: (sq.charCodeAt(0) - 97) * cell,
    y: (8 - Number(sq[1])) * cell,
  });
  if (squares.length === 0) return null;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <marker
          id={markerId}
          markerHeight="7"
          markerWidth="7"
          orient="auto-start-reverse"
          refX="6"
          refY="3.5"
        >
          <path d="M0,0 L7,3.5 L0,7 z" fill="#f59e0b" />
        </marker>
      </defs>
      {squares.map((sq) => {
        const f = pos(sq.from);
        const t = pos(sq.to);
        return (
          <g key={`${sq.from}${sq.to}`}>
            <rect
              fill="none"
              height={cell}
              stroke="#eab308"
              strokeWidth="6"
              width={cell}
              x={f.x}
              y={f.y}
            />
            <rect
              fill="none"
              height={cell}
              stroke="#22c55e"
              strokeWidth="6"
              width={cell}
              x={t.x}
              y={t.y}
            />
            <line
              markerEnd={`url(#${markerId})`}
              stroke="#f59e0b"
              strokeLinecap="round"
              strokeWidth="8"
              x1={f.x + cell / 2}
              x2={t.x + cell / 2}
              y1={f.y + cell / 2}
              y2={t.y + cell / 2}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Was gerade zu sehen ist — im Blinken wechselt es zu schnell, um es zu benennen. */
function label(mode: CompareView["mode"], hover: boolean): string {
  if (mode === "diff") return hover ? "nachher" : "differenz";
  if (mode === "blink") return hover ? "vorher / nachher" : "nachher";
  return hover ? "vorher" : "nachher";
}

/** `ply 4 Nf6`, or the whole sequence when several halves landed on one frame. */
export function sequenceLabel(card: ReviewCard): string {
  const sans = card.plies.map((p) => p.san);
  if (card.plies.length === 1) return `ply ${card.plies[0].ply} ${sans[0]}`;
  return `Plies ${card.plies[0].ply}–${card.plies[card.plies.length - 1].ply}: ${sans.join(" + ")}`;
}

/**
 * The commit's frame window with its pager — the same series for a judged card and a viewed one.
 * A commit can anchor mid-hand (a verify or pair commit, or a blitz reply already arriving), so
 * ONE picture is sometimes a hand and nothing else; the human steps through what exists.
 */
export function FrameSeries({
  name,
  card,
  at,
  step,
  onZoom,
  view = COMPARE_OFF,
  priority = false,
}: {
  name: string;
  card: ReviewCard;
  at: number;
  step: (delta: number) => void;
  onZoom: (zoom: Zoom) => void;
  /** Wie das Bild vor dem Zug daruebergelegt wird — ohne Angabe gar nicht. */
  view?: CompareView;
  /** The stream shows ONE card at a time — its picture is the page's largest paint. */
  priority?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const entry = card.stems[at] ?? null;
  const width = entry?.width ?? 720;
  const height = entry?.height ?? 816;
  const squares = card.plies.flatMap((p) => (p.squares ? [p.squares] : []));
  if (!entry)
    return (
      <p className="text-muted-foreground text-sm">
        Kein Bild auf der Platte für dieses Fenster.
      </p>
    );
  const offset = Number(entry.stem) - card.frame;
  const compared = card.before !== null && view.mode !== "off";
  const picture = (
    <button
      className="border-border relative block w-full cursor-zoom-in overflow-hidden rounded border"
      onBlur={() => setHover(false)}
      onClick={() =>
        onZoom({
          stem: entry.stem,
          width,
          height,
          squares,
          before: card.before,
        })
      }
      onFocus={() => setHover(true)}
      onPointerDown={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerMove={() => (hover ? null : setHover(true))}
      onPointerUp={() => setHover(false)}
      style={{ aspectRatio: `${width} / ${height}` }}
      type="button"
    >
      <ComparePair
        after={entry}
        before={card.before}
        hover={hover}
        name={name}
        priority={priority}
        view={view}
      />
      <MoveOverlay height={height} squares={squares} width={width} />
      {compared ? (
        <span className="bg-background/70 text-muted-foreground absolute top-1 left-1 rounded px-1 font-mono text-[10px]">
          {label(view.mode, hover)}
        </span>
      ) : null}
    </button>
  );
  return (
    <>
      {/* Beim Vergleichen ist die Maus auf dem Bild die Bedienung — ein Tooltip legt sich dann
          ueber die Nachbarkarte und verdeckt genau das, was der Auditor liest. */}
      {compared ? (
        picture
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{picture}</TooltipTrigger>
          <TooltipContent>klicken zum Vergrößern</TooltipContent>
        </Tooltip>
      )}
      {view.loupe && card.before ? (
        <SquareLoupe
          after={entry}
          before={card.before}
          name={name}
          squares={squares}
          view={view}
        />
      ) : null}
      {card.stems.length > 1 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="max-sm:h-11"
                  disabled={at === 0}
                  onClick={() => step(-1)}
                  size="sm"
                  variant="outline"
                >
                  ◀
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>ein Bild zurück (Pfeil links)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="max-sm:h-11"
                  disabled={at + 1 >= card.stems.length}
                  onClick={() => step(1)}
                  size="sm"
                  variant="outline"
                >
                  ▶
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>ein Bild vor (Pfeil rechts)</TooltipContent>
          </Tooltip>
          <span className="font-mono">
            frame {entry.stem} ({offset >= 0 ? "+" : ""}
            {offset}) · {at + 1}/{card.stems.length}
          </span>
        </div>
      ) : null}
    </>
  );
}

/** The full-screen picture. Click anywhere closes it — the same gesture that opened it. */
export function ZoomOverlay({
  name,
  zoom,
  view = COMPARE_OFF,
  onClose,
}: {
  name: string;
  zoom: Zoom;
  view?: CompareView;
  onClose: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="fixed inset-0 z-50 cursor-zoom-out bg-black/90"
      onClick={onClose}
      type="button"
    >
      <span
        className="relative mx-auto block h-full"
        style={{ aspectRatio: `${zoom.width} / ${zoom.height}` }}
      >
        <ComparePair
          after={{
            stem: zoom.stem,
            kind: "plain",
            width: zoom.width,
            height: zoom.height,
          }}
          before={zoom.before}
          hover={hover}
          name={name}
          view={view}
        />
        <MoveOverlay
          height={zoom.height}
          squares={zoom.squares}
          width={zoom.width}
        />
      </span>
      {zoom.before && view.mode !== "off" ? (
        <span
          className="bg-background/80 absolute bottom-4 left-1/2 -translate-x-1/2 rounded px-3 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
        >
          {hover
            ? "vorher — frame " + zoom.before.stem
            : "hier halten für die Stellung davor"}
        </span>
      ) : null}
    </button>
  );
}
