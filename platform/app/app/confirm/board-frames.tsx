"use client";

import Image from "next/image";
import { useId } from "react";
import { Button } from "@/components/ui/button";

import type { MoveSquares, ReviewCard } from "@/lib/review-cards";

/**
 * The commit picture and its pager, shared by the confirm page and the ZÜGE stream.
 *
 * Extracted unchanged when the stream landed (CONCEPT.md §4.1): the two surfaces ask the SAME
 * question of the same window, and a second copy of the overlay geometry is the copy that drifts.
 */

/** What a click on a picture opens full-screen. */
export type Zoom = { stem: string; height: number; squares: MoveSquares[] };

/**
 * The claimed move(s), drawn ONTO the rectified board so the human answers yes/no by looking.
 * The review PNG is 720x816 with the board as the top 720x720 and a8 at the top-left, so a
 * square is a plain 90 px grid cell; the SVG shares the image's viewBox and scales with it.
 * A multi-commit draws every half of the sequence — the picture shows the end of all of them.
 */
export function MoveOverlay({
  squares,
  height = 816,
}: {
  squares: MoveSquares[];
  /** 816 for the labeled burst PNGs (board + strip), 720 for a plain rectified board. */
  height?: number;
}) {
  /** One marker per overlay instance — several cards draw arrows on the same page. React's id
   *  carries punctuation that has no business inside a `url(#…)`, so only the letters survive. */
  const markerId = `arrow${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const cell = 90;
  const pos = (sq: string) => ({
    x: (sq.charCodeAt(0) - 97) * cell,
    y: (8 - Number(sq[1])) * cell,
  });
  if (squares.length === 0) return null;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 720 ${height}`}
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
  priority = false,
}: {
  name: string;
  card: ReviewCard;
  at: number;
  step: (delta: number) => void;
  onZoom: (zoom: Zoom) => void;
  /** The stream shows ONE card at a time — its picture is the page's largest paint. */
  priority?: boolean;
}) {
  const entry = card.stems[at] ?? null;
  const height = entry?.kind === "plain" ? 720 : 816;
  const squares = card.plies.flatMap((p) => (p.squares ? [p.squares] : []));
  if (!entry) return <p className="text-muted-foreground text-sm">no frame on disk for this window</p>;
  const offset = Number(entry.stem) - card.frame;
  return (
    <>
      <button
        className="border-border relative block w-full cursor-zoom-in overflow-hidden rounded border"
        onClick={() => onZoom({ stem: entry.stem, height, squares })}
        style={{ aspectRatio: `720 / ${height}` }}
        title="click to enlarge"
        type="button"
      >
        <Image
          alt={`frame ${entry.stem}`}
          className="object-contain"
          fill
          priority={priority}
          sizes="(min-width: 768px) 45vw, 90vw"
          src={`/api/frame/${name}/${entry.stem}`}
          unoptimized
        />
        <MoveOverlay height={height} squares={squares} />
      </button>
      {card.stems.length > 1 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Button
            className="max-sm:h-11"
            disabled={at === 0}
            onClick={() => step(-1)}
            size="sm"
            variant="outline"
          >
            ◀
          </Button>
          <Button
            className="max-sm:h-11"
            disabled={at + 1 >= card.stems.length}
            onClick={() => step(1)}
            size="sm"
            variant="outline"
          >
            ▶
          </Button>
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
export function ZoomOverlay({ name, zoom, onClose }: { name: string; zoom: Zoom; onClose: () => void }) {
  return (
    <button className="fixed inset-0 z-50 cursor-zoom-out bg-black/90" onClick={onClose} type="button">
      <span className="relative mx-auto block h-full" style={{ aspectRatio: `720 / ${zoom.height}` }}>
        <Image
          alt={`frame ${zoom.stem} enlarged`}
          className="object-contain"
          fill
          sizes="100vw"
          src={`/api/frame/${name}/${zoom.stem}`}
          unoptimized
        />
        <MoveOverlay height={zoom.height} squares={zoom.squares} />
      </span>
    </button>
  );
}
