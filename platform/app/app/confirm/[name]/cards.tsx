"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { FrameStem } from "@/lib/data";

export type UnmatchedCard = {
  index: number;
  ply: number;
  san: string;
  frame: number;
  /** The review frames on disk between this commit and the next, chronological. */
  stems: FrameStem[];
  /** Index into [stems] nearest the commit — where the card opens. */
  start: number;
  /** SANs of every ply committed on this frame, when there is more than one (a pair/bridge). */
  group: string[];
  /** Only the last ply of a same-frame group owns an interval; the others contribute no frames. */
  lastOfGroup: boolean;
  /** Pre-fix pair row: ONE entry holding several halves — the picture shows the position after ALL. */
  collapsed: boolean;
  duplicate: boolean;
  squares: { from: string; to: string } | null;
};

/**
 * The claimed move, drawn ONTO the rectified board so the human answers yes/no by looking.
 * The review PNG is 720x816 with the board as the top 720x720 and a8 at the top-left, so a
 * square is a plain 90 px grid cell; the SVG shares the image's viewBox and scales with it.
 */
function MoveOverlay({
  squares,
  height = 816,
}: {
  squares: { from: string; to: string } | null;
  /** 816 for the labeled burst PNGs (board + strip), 720 for a plain rectified board. */
  height?: number;
}) {
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
  const [zoom, setZoom] = useState<{
    stem: string;
    height: number;
    squares: UnmatchedCard["squares"];
  } | null>(null);
  const [state, setState] = useState<"idle" | "writing" | string>("idle");
  /** Which of a card's stems is showing — a commit can anchor mid-hand, so one frame is not enough. */
  const [frameAt, setFrameAt] = useState<Record<number, number>>({});

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
          const at = frameAt[card.index] ?? card.start;
          const entry = card.stems[at] ?? null;
          const stem = entry?.stem ?? null;
          const height = entry?.kind === "plain" ? 720 : 816;
          const offset = stem !== null ? Number(stem) - card.frame : 0;
          const step = (delta: number) =>
            setFrameAt((f) => ({
              ...f,
              [card.index]: Math.max(0, Math.min(card.stems.length - 1, at + delta)),
            }));
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
                  {card.group.length > 0 ? (
                    <Badge
                      title={
                        card.lastOfGroup
                          ? "Mehrere Halbzüge auf einem Frame — KEEP verbürgt die Stellung nach ALLEN."
                          : "Nur der letzte Ply der Gruppe besitzt ein Intervall; dieser trägt 0 Frames bei."
                      }
                      variant="secondary"
                    >
                      {card.group.length} Halbzüge @{card.frame}: {card.group.join(" + ")}
                      {card.lastOfGroup ? "" : " · trägt 0 Frames bei"}
                    </Badge>
                  ) : null}
                  {card.collapsed ? (
                    <Badge
                      title="Ein Eintrag aus der Zeit vor dem Pair-Fix: er enthält mehrere Halbzüge in einer Zeile. Das Bild zeigt die Stellung nach ALLEN — genau die vermerkt KEEP."
                      variant="secondary"
                    >
                      Mehrfach-Commit — Bild zeigt Stellung nach allen Halbzügen
                    </Badge>
                  ) : null}
                  {card.duplicate ? <Badge variant="secondary">also missed in PGN</Badge> : null}
                  <Badge variant={isKept ? "default" : "outline"}>
                    {isKept ? "will be KEPT" : "will be dropped"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stem ? (
                  <>
                    <button
                      className="border-border relative block w-full cursor-zoom-in overflow-hidden rounded border"
                      onClick={() => setZoom({ stem, height, squares: card.squares })}
                      style={{ aspectRatio: `720 / ${height}` }}
                      title="click to enlarge"
                      type="button"
                    >
                      <Image
                        alt={`frame ${stem}`}
                        className="object-contain"
                        fill
                        sizes="(min-width: 768px) 45vw, 90vw"
                        src={`/api/frame/${name}/${stem}`}
                        unoptimized
                      />
                      <MoveOverlay height={height} squares={card.squares} />
                    </button>
                    {card.stems.length > 1 ? (
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Button disabled={at === 0} onClick={() => step(-1)} size="sm" variant="outline">
                          ◀
                        </Button>
                        <Button
                          disabled={at + 1 >= card.stems.length}
                          onClick={() => step(1)}
                          size="sm"
                          variant="outline"
                        >
                          ▶
                        </Button>
                        <span className="font-mono">
                          frame {stem} ({offset >= 0 ? "+" : ""}
                          {offset}) · {at + 1}/{card.stems.length}
                        </span>
                        <span>Hand im Bild? Weiterblättern — jedes Bild zeigt dieselbe Stellung.</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">no frame on disk for this window</p>
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
          <span
            className="relative mx-auto block h-full"
            style={{ aspectRatio: `720 / ${zoom.height}` }}
          >
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
      ) : null}
    </section>
  );
}
