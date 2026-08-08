"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Proposal, Streams as StreamSets } from "@/lib/proposals";
import { BucketGrid } from "./bucket";
import { Drilldown, type FrameInfo } from "./drilldown";
import { TinderBand } from "./tinder";

export type StreamProps = {
  name: string;
  sessionId: string;
  streams: StreamSets;
  decided: Record<string, string>;
  frames: FrameInfo[];
};

type Tab = "confirm" | "control" | "tinder" | "board";

/**
 * The three streams share two things and nothing else: the queue an exception falls into, and
 * the count of rows this session has written. Everything else lives in the stream that owns it.
 */
export function Streams({ name, sessionId, streams, decided, frames }: StreamProps) {
  const [tab, setTab] = useState<Tab>("confirm");
  const [queue, setQueue] = useState<Proposal[]>([]);
  const [written, setWritten] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wrote = (n: number) => setWritten((w) => w + n);
  const failed = (e: unknown) => setError(String(e));

  const tabs: [Tab, string][] = [
    ["confirm", `bucket · occluded ${streams.confirm.length}`],
    ["control", `bucket · control ${streams.control.length}`],
    ["tinder", `tinder ${streams.tinder.length + queue.length}`],
    ["board", `board drilldown ${frames.length}`],
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(([key, label]) => (
          <Button
            key={key}
            // Blurred on purpose: the streams listen on `window`, and a focused button would
            // eat the Enter that confirms a page.
            onClick={(event) => {
              event.currentTarget.blur();
              setTab(key);
            }}
            size="sm"
            variant={tab === key ? "default" : "outline"}
          >
            {label}
          </Button>
        ))}
        <span className="text-muted-foreground ml-auto text-sm">
          {written} rows written this session
        </span>
        {error ? <Badge variant="destructive">{error}</Badge> : null}
      </div>

      {tab === "confirm" || tab === "control" ? (
        <BucketGrid
          key={tab}
          cells={tab === "confirm" ? streams.confirm : streams.control}
          decided={decided}
          kind={tab}
          name={name}
          onException={(cells) => setQueue((q) => [...q, ...cells])}
          onError={failed}
          onWritten={wrote}
          sessionId={sessionId}
        />
      ) : null}

      {tab === "tinder" ? (
        <TinderBand
          cells={[...queue, ...streams.tinder]}
          name={name}
          onError={failed}
          onWritten={wrote}
          sessionId={sessionId}
        />
      ) : null}

      {tab === "board" ? (
        <Drilldown
          decided={decided}
          frames={frames}
          name={name}
          onError={failed}
          onWritten={wrote}
          sessionId={sessionId}
        />
      ) : null}
    </section>
  );
}
