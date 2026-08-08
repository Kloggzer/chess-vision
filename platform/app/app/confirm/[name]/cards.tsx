"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type UnmatchedCard = {
  index: number;
  ply: number;
  san: string;
  frame: number;
  stem: string | null;
  duplicate: boolean;
  squares: { from: string; to: string } | null;
};

/**
 * The claimed move, drawn ONTO the rectified board so the human answers yes/no by looking.
 * The review PNG is 720x816 with the board as the top 720x720 and a8 at the top-left, so a
 * square is a plain 90 px grid cell; the SVG shares the image's viewBox and scales with it.
 */
function MoveOverlay({ squares }: { squares: { from: string; to: string } | null }) {
  if (!squares) return null;
  const cell = 90;
  const pos = (sq: string) => ({
    x: (sq.charCodeAt(0) - 97) * cell,
    y: (8 - Number(sq[1])) * cell,
  });
  const f = pos(squares.from);
  const t = pos(squares.to);
  const markerId = `arrow-${squares.from}${squares.to}`;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 720 816"
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
    </svg>
  );
}

export function UnmatchedCards({ name, cards }: { name: string; cards: UnmatchedCard[] }) {
  const [kept, setKept] = useState<Record<number, boolean>>({});
  const [zoom, setZoom] = useState<{ stem: string; squares: UnmatchedCard["squares"] } | null>(null);
  const [state, setState] = useState<"idle" | "writing" | string>("idle");

  async function confirm() {
    setState("writing");
    const res = await fetch(`/api/confirm/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kept: cards.filter((c) => kept[c.index]).map((c) => c.index) }),
    });
    const body = await res.json();
    setState(res.ok ? `confirmed — ${body.reviewed_plies.length} reviewed plies` : `error: ${body.error}`);
  }

  const keptCount = cards.filter((c) => kept[c.index]).length;

  return (
    <section className="space-y-4">
      <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Your call, one move at a time:</p>
        <p className="text-muted-foreground">
          The tracker committed these {cards.length} moves, but they do not line up with the
          reference game. The claimed move is DRAWN on each board: yellow = from, green arrow →
          to. One question per card:{" "}
          <strong className="text-foreground">
            does the photo show the position right AFTER this move?
          </strong>{" "}
          Yes → KEEP (it enters the label timeline). No → DROP. Everything starts as DROP; the
          square labels on the picture are only the tracker&apos;s belief — trust the wooden
          pieces, not the text. Click any picture to enlarge.
        </p>
        <p className="text-muted-foreground">
          <Badge variant="secondary">also missed in PGN</Badge>: the same move also appears as
          missing from the reference — usually a real move committed LATE after a resync. Late
          means the board has already moved on, so the photo will NOT match and DROP is
          typically right. When in doubt, drop: a dropped ply costs a few crops, a wrongly kept
          one mislabels a whole interval.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const isKept = !!kept[card.index];
          return (
            <Card
              key={card.index}
              className={isKept ? "border-green-600" : "border-red-900/60"}
            >
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-base">
                  ply {card.ply} {card.san}
                  {card.squares ? (
                    <span className="text-muted-foreground text-xs">
                      {card.squares.from} → {card.squares.to}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs">@frame {card.frame}</span>
                  {card.duplicate ? <Badge variant="secondary">also missed in PGN</Badge> : null}
                  <Badge variant={isKept ? "default" : "outline"}>
                    {isKept ? "will be KEPT" : "will be dropped"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {card.stem ? (
                  <button
                    className="border-border relative block w-full cursor-zoom-in overflow-hidden rounded border"
                    onClick={() => card.stem && setZoom({ stem: card.stem, squares: card.squares })}
                    style={{ aspectRatio: "720 / 816" }}
                    title="click to enlarge"
                    type="button"
                  >
                    <Image
                      alt={`frame ${card.stem}`}
                      className="object-contain"
                      fill
                      sizes="(min-width: 768px) 45vw, 90vw"
                      src={`/api/frame/${name}/${card.stem}`}
                      unoptimized
                    />
                    <MoveOverlay squares={card.squares} />
                  </button>
                ) : (
                  <p className="text-muted-foreground text-sm">no frame within ±2</p>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={isKept ? "default" : "outline"}
                    onClick={() => setKept((k) => ({ ...k, [card.index]: true }))}
                  >
                    keep — the picture shows this move
                  </Button>
                  <Button
                    className="flex-1"
                    variant={isKept ? "outline" : "destructive"}
                    onClick={() => setKept((k) => ({ ...k, [card.index]: false }))}
                  >
                    drop
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="border-border flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <Button disabled={state === "writing"} onClick={confirm} size="lg">
          Confirm: keep {keptCount} of {cards.length}, drop the rest
        </Button>
        <span className="text-muted-foreground text-sm">
          {state === "idle"
            ? "writes confirmed + reviewed_plies into candidate.json — nothing else changes"
            : state}
        </span>
      </div>

      {zoom ? (
        <button
          className="fixed inset-0 z-50 cursor-zoom-out bg-black/90"
          onClick={() => setZoom(null)}
          type="button"
        >
          <span className="relative mx-auto block h-full" style={{ aspectRatio: "720 / 816" }}>
            <Image
              alt={`frame ${zoom.stem} enlarged`}
              className="object-contain"
              fill
              sizes="100vw"
              src={`/api/frame/${name}/${zoom.stem}`}
              unoptimized
            />
            <MoveOverlay squares={zoom.squares} />
          </span>
        </button>
      ) : null}
    </section>
  );
}
