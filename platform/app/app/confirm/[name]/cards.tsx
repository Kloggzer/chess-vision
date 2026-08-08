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

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={confirm} disabled={state === "writing"}>
          Confirm ({cards.filter((c) => kept[c.index]).length} kept)
        </Button>
        <span className="text-muted-foreground text-sm">{state === "idle" ? "" : state}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.index} className={kept[card.index] ? "border-primary" : undefined}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-base">
                ply {card.ply} {card.san}
                <span className="text-muted-foreground text-xs">@frame {card.frame}</span>
                {card.duplicate ? <Badge variant="secondary">also missed in PGN</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {card.stem ? (
                <div className="border-border relative aspect-video w-full overflow-hidden rounded border">
                  <Image
                    alt={`frame ${card.stem}`}
                    className="object-contain"
                    fill
                    sizes="50vw"
                    src={`/api/frame/${name}/${card.stem}`}
                    unoptimized
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">no frame within ±2</p>
              )}
              <Button
                variant={kept[card.index] ? "default" : "outline"}
                onClick={() => setKept((k) => ({ ...k, [card.index]: !k[card.index] }))}
              >
                {kept[card.index] ? "keep" : "drop"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
