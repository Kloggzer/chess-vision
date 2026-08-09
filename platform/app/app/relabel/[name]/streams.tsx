"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Proposal, Streams as StreamSets } from "@/lib/proposals";
import { BucketGrid } from "./bucket";
import { Drilldown, type FrameInfo } from "./drilldown";
import { FilterBar, type FilterAnswer, type FilterHit } from "./filter";
import { TinderBand } from "./tinder";

export type StreamProps = {
  name: string;
  sessionId: string;
  streams: StreamSets;
  decided: Record<string, string>;
  frames: FrameInfo[];
  /** The next session with open proposals, or null — the done banner links to it. */
  next: string | null;
  /** The default filter query, answered on the server (see `FilterBar.initial`). */
  filter: FilterAnswer;
};

type Tab = "confirm" | "control" | "tinder" | "board" | "filter";

/**
 * The three streams share two things and nothing else: the queue an exception falls into, and
 * the count of rows this session has written. Everything else lives in the stream that owns it.
 */
export function Streams({ name, sessionId, streams, decided, frames, next, filter }: StreamProps) {
  const [tab, setTab] = useState<Tab>("confirm");
  const [queue, setQueue] = useState<Proposal[]>([]);
  const [written, setWritten] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneTabs, setDoneTabs] = useState<Set<Tab>>(new Set());
  /** A filter's answer, standing in for the full frame list until it is cleared. */
  const [boardQueue, setBoardQueue] = useState<{ hits: FilterHit[]; label: string } | null>(null);

  const wrote = (n: number) => setWritten((w) => w + n);
  const failed = (e: unknown) => setError(String(e));
  const markDone = (key: Tab) => () => setDoneTabs((d) => new Set(d).add(key));
  // The board drilldown is the optional precision pass — three streams decide "done".
  const allDone = (["confirm", "control", "tinder"] as Tab[]).every(
    (key) =>
      doneTabs.has(key) ||
      (key === "confirm" && streams.confirm.length === 0) ||
      (key === "control" && streams.control.length === 0) ||
      (key === "tinder" && streams.tinder.length + queue.length === 0),
  );

  const tabs: [Tab, string][] = [
    ["confirm", `bucket · occluded ${streams.confirm.length}`],
    ["control", `bucket · control ${streams.control.length}`],
    ["tinder", `tinder ${streams.tinder.length + queue.length}`],
    ["board", boardQueue ? `board queue ${boardQueue.hits.length}` : `board drilldown ${frames.length}`],
    ["filter", "filter by class"],
  ];

  // The filter's boards, in its order, as the drilldown's queue — and the matched squares per
  // frame so the brush starts where the model is suspicious instead of on an empty board.
  const byStem = new Map(frames.map((f) => [f.stem, f]));
  const queued: FrameInfo[] = (boardQueue?.hits ?? [])
    .map((h) => byStem.get(h.stem) ?? { stem: h.stem, ply: 0, fen: "" })
    .filter((f) => f.fen !== "");
  const hits = Object.fromEntries((boardQueue?.hits ?? []).map((h) => [h.stem, h.squares]));

  return (
    <section className="space-y-4">
      {allDone ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-green-600 bg-green-950/40 p-4">
          <span className="text-lg font-semibold">Session fertig ✓</span>
          <span className="text-muted-foreground text-sm">
            {written} rows written · board drilldown stays open for touch-ups
          </span>
          {next ? (
            <Button asChild size="lg">
              <a href={`/relabel/${next}`}>Nächste Session: {next} →</a>
            </Button>
          ) : (
            <Badge variant="secondary">alle Sessions durch — Zeit für Phase 04</Badge>
          )}
        </div>
      ) : null}
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
          onDone={markDone(tab)}
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
          onDone={markDone("tinder")}
          onError={failed}
          onWritten={wrote}
          sessionId={sessionId}
        />
      ) : null}

      {tab === "board" ? (
        <>
          {boardQueue ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">queue: {boardQueue.label}</Badge>
              <Button onClick={() => setBoardQueue(null)} size="sm" variant="outline">
                clear queue — back to all {frames.length} boards
              </Button>
            </div>
          ) : null}
          <Drilldown
            decided={decided}
            frames={boardQueue ? queued : frames}
            hits={boardQueue ? hits : undefined}
            key={boardQueue?.label ?? "all"}
            name={name}
            onError={failed}
            onWritten={wrote}
            queueNote={boardQueue?.label}
            sessionId={sessionId}
          />
        </>
      ) : null}

      {tab === "filter" ? (
        <FilterBar
          initial={filter}
          name={name}
          onQueue={(hits, label) => {
            setBoardQueue({ hits, label });
            setTab("board");
          }}
        />
      ) : null}
    </section>
  );
}
