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
};

export function UnmatchedCards({ name, cards }: { name: string; cards: UnmatchedCard[] }) {
  const [kept, setKept] = useState<Record<number, boolean>>({});
  const [zoom, setZoom] = useState<string | null>(null);
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
          reference game. Look at each board picture (click it to enlarge — the labels on the
          squares are what the tracker believed). Press{" "}
          <strong className="text-foreground">KEEP</strong> if the position really shows this
          move was played — it then enters the label timeline. Press{" "}
          <strong className="text-foreground">DROP</strong> if it is wrong. Everything starts as
          DROP; when you are done, press Confirm below.
        </p>
        <p className="text-muted-foreground">
          <Badge variant="secondary">also missed in PGN</Badge> means the same move also appears
          as missing from the reference — typically the real move committed LATE after a resync.
          If the picture matches the move, KEEP is usually right.
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
                    onClick={() => setZoom(card.stem)}
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
          className="fixed inset-0 z-50 cursor-zoom-out bg-black/90 p-4"
          onClick={() => setZoom(null)}
          type="button"
        >
          <Image
            alt={`frame ${zoom} enlarged`}
            className="object-contain"
            fill
            sizes="100vw"
            src={`/api/frame/${name}/${zoom}`}
            unoptimized
          />
        </button>
      ) : null}
    </section>
  );
}
