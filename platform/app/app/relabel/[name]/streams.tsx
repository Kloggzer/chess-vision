"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Proposal, Streams as StreamSets } from "@/lib/proposals";
import { BucketGrid } from "./bucket";
import { Drilldown, type FrameInfo } from "./drilldown";
import { FilterBar, type FilterAnswer, type FilterHit } from "./filter";

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
  /** Every board with occlusion suspicion, chronological — the hand-painting queue. */
  hands: FilterHit[];
};

type Tab = "hands" | "confirm" | "unsure" | "control" | "board" | "filter";

/**
 * The views share two things and nothing else: the queue an exception falls into (the
 * hand-painting board queue, since the tinder band left), and the count of rows this session has
 * written. Everything else lives in the view that owns it.
 */
export function Streams({ name, sessionId, streams, decided, frames, next, filter, hands }: StreamProps) {
  const [tab, setTab] = useState<Tab>("hands");
  const [exceptions, setExceptions] = useState<Proposal[]>([]);
  const [written, setWritten] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneTabs, setDoneTabs] = useState<Set<Tab>>(new Set());
  /** A filter's answer, standing in for the full frame list until it is cleared. */
  const [boardQueue, setBoardQueue] = useState<{ hits: FilterHit[]; label: string } | null>(null);

  const wrote = (n: number) => setWritten((w) => w + n);
  const failed = (e: unknown) => setError(String(e));
  // Bail out when nothing changes: this fires from a bucket's `useEffect`, and returning a fresh
  // Set for an already-done tab re-rendered forever ("Maximum update depth exceeded", 2026-08-10).
  const markDone = (key: Tab) => () => setDoneTabs((d) => (d.has(key) ? d : new Set(d).add(key)));
  // The painting queue and the drilldown are open-ended touch-up work; the buckets decide "done".
  const buckets: [Tab, Proposal[]][] = [
    ["confirm", streams.confirm],
    ["unsure", streams.unsure],
    ["control", streams.control],
  ];
  const allDone = buckets.every(([key, cells]) => doneTabs.has(key) || cells.length === 0);

  // Exceptions thrown out of a bucket page land on the painting queue: their frames join the
  // hand boards, the thrown squares outlined, so the human RULES on them with the brush instead
  // of swiping crops one by one.
  const handHits: FilterHit[] = useMemo(() => {
    const byStem = new Map(hands.map((h) => [h.stem, { ...h, squares: [...h.squares] }]));
    for (const cell of exceptions) {
      const hit = byStem.get(cell.frame) ?? { stem: cell.frame, squares: [] };
      if (!hit.squares.includes(cell.square)) hit.squares.push(cell.square);
      hit.accept = { ...hit.accept, [cell.square]: "occluded" };
      byStem.set(cell.frame, hit);
    }
    return [...byStem.values()].sort((a, b) => a.stem.localeCompare(b.stem));
  }, [hands, exceptions]);

  const tabs: [Tab, string][] = [
    ["hands", `hände einzeichnen ${handHits.length}`],
    ["confirm", `bucket · occluded ${streams.confirm.length}`],
    ["unsure", `bucket · unsicher ${streams.unsure.length}`],
    ["control", `bucket · control ${streams.control.length}`],
    ["board", boardQueue ? `board queue ${boardQueue.hits.length}` : `board drilldown ${frames.length}`],
    ["filter", "filter by class"],
  ];

  // A queue's boards, in its order, as the drilldown's queue — and the matched squares per
  // frame so the brush starts where the suspicion is instead of on an empty board.
  const byStem = new Map(frames.map((f) => [f.stem, f]));
  const queueFrames = (hits: FilterHit[]): FrameInfo[] =>
    hits.map((h) => byStem.get(h.stem) ?? { stem: h.stem, ply: 0, fen: "" }).filter((f) => f.fen !== "");
  const asRecords = (hits: FilterHit[]) => ({
    hits: Object.fromEntries(hits.map((h) => [h.stem, h.squares])),
    reads: Object.fromEntries(hits.map((h) => [h.stem, h.reads ?? {}])),
    accepts: Object.fromEntries(hits.map((h) => [h.stem, h.accept ?? {}])),
  });
  const hand = asRecords(handHits);
  const queued = asRecords(boardQueue?.hits ?? []);

  return (
    <section className="space-y-4">
      {allDone ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-green-600 bg-green-950/40 p-4">
          <span className="text-lg font-semibold">Session fertig ✓</span>
          <span className="text-muted-foreground text-sm">
            {written} rows written · Hände-Ansicht und Drilldown bleiben für Nacharbeit offen
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
            // The first thing a thumb has to hit on this screen, and it was 28 px tall.
            className="max-sm:h-11 max-sm:px-3"
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

      {tab === "hands" ? (
        <Drilldown
          accepts={hand.accepts}
          decided={decided}
          frames={queueFrames(handHits)}
          hits={hand.hits}
          key={`hands-${handHits.length}`}
          name={name}
          onError={failed}
          onWritten={wrote}
          queueNote="Hände einzeichnen — jedes Brett mit Okklusionsverdacht, chronologisch"
          reads={hand.reads}
          sessionId={sessionId}
        />
      ) : null}

      {tab === "confirm" || tab === "unsure" || tab === "control" ? (
        <BucketGrid
          key={tab}
          cells={buckets.find(([key]) => key === tab)![1]}
          decided={decided}
          kind={tab === "control" ? "control" : "confirm"}
          name={name}
          onDone={markDone(tab)}
          onException={(cells) => setExceptions((q) => [...q, ...cells])}
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
              <Button className="max-sm:h-11 max-sm:px-3" onClick={() => setBoardQueue(null)} size="sm" variant="outline">
                clear queue — back to all {frames.length} boards
              </Button>
            </div>
          ) : null}
          <Drilldown
            accepts={boardQueue ? queued.accepts : undefined}
            decided={decided}
            frames={boardQueue ? queueFrames(boardQueue.hits) : frames}
            hits={boardQueue ? queued.hits : undefined}
            reads={boardQueue ? queued.reads : undefined}
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
