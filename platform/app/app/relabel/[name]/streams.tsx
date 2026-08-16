"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/progress";
import type { Correction, Ledger } from "@/lib/corrections";
import type { Proposal, Streams as StreamSets } from "@/lib/proposals";
import { addRows, emptyTally, type Tally } from "@/lib/session-tally";
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
  /** Boards with proposals and how many of them carry a verdict — this session's denominator. */
  boards: number;
  boardsDone: number;
};

type Tab = "hands" | "confirm" | "unsure" | "control" | "board" | "filter";

/**
 * What this session did (CONCEPT.md 6.1) + what it owes overall.
 * "since load" because reload zeros counters; persistent number from server.
 */
function SessionPanel({
  boards,
  boardsDone,
  tally,
}: {
  boards: number;
  boardsDone: number;
  tally: Tally;
}) {
  const items: [string, number, string][] = [
    ["Bretter fertig", tally.boards.size, "distinkte Frames, die seit dem Laden in ein Ledger geschrieben haben"],
    ["Zellen occluded", tally.cellsOccluded, "Zeilen mit label occluded in corrections.jsonl"],
    ["Zellen bestätigt", tally.cellsConfirmed, "Zeilen in reviewed.jsonl — der FEN stimmte"],
    ["Figuren korrigiert", tally.piecesCorrected, "Zeilen mit einem Label außer occluded und empty"],
  ];
  return (
    <div className="border-border bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
      {boards > 0 ? (
        <Progress done={boardsDone} total={boards} unit="Bretter" />
      ) : (
        <span className="text-muted-foreground">keine Bretter mit Vorschlägen</span>
      )}
      {items.map(([label, value, why]) => (
        <span className="text-muted-foreground" key={label} title={`${why} — seit dem Laden`}>
          {label} <strong className="text-foreground tabular-nums">{value}</strong>
        </span>
      ))}
    </div>
  );
}

/**
 * The views share two things and nothing else: the queue an exception falls into (the
 * hand-painting board queue, since the tinder band left), and the count of rows this session has
 * written. Everything else lives in the view that owns it.
 */
export function Streams(props: StreamProps) {
  const { name, sessionId, streams, decided, frames, next, filter, hands, boards, boardsDone } = props;
  const [tab, setTab] = useState<Tab>("hands");
  const [exceptions, setExceptions] = useState<Proposal[]>([]);
  const [tally, setTally] = useState(emptyTally);
  const [error, setError] = useState<string | null>(null);
  const [doneTabs, setDoneTabs] = useState<Set<Tab>>(new Set());
  /** A filter's answer, standing in for the full frame list until it is cleared. */
  const [boardQueue, setBoardQueue] = useState<{ hits: FilterHit[]; label: string } | null>(null);

  const wrote = (rows: Correction[], ledger: Ledger) => setTally((t) => addRows(t, rows, ledger));
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

  // Exceptions from bucket → painting queue: rule with brush, not crops.
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

  // Jede Zahl mit ihrer Einheit, nie ein nackter Mischwert (CONCEPT.md 4.2): eine Lane rendert
  // Bretter, die nächste Zellen, und 5 230 Zellen sind nicht 5 230 Bretter Arbeit. Wo der
  // Producer nichts erzeugt hat — keine `probs`, also keine Klassenliste — steht „—", nie „0".
  const classChip = filter.classes.length > 0 ? `${filter.classes.length} Klassen` : "—";
  const tabs: [Tab, string, string | undefined][] = [
    ["hands", `Hände ${handHits.length} Bretter`, "jedes Brett mit Okklusionsverdacht, chronologisch"],
    ["confirm", `occluded ${streams.confirm.length} Zellen`, undefined],
    ["unsure", `unsicher ${streams.unsure.length} Zellen`, undefined],
    ["control", `Stichprobe ${streams.control.length} Zellen`, undefined],
    [
      "board",
      boardQueue ? `Queue ${boardQueue.hits.length} Bretter` : `Drilldown ${frames.length} Bretter`,
      undefined,
    ],
    [
      "filter",
      `Filter ${classChip}`,
      filter.classes.length > 0
        ? undefined
        : "keine Modell-Lesarten in dieser Datei — propose-occluded lief ohne --model, also gibt es nichts zu filtern (nicht: nichts gefunden)",
    ],
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
            {tally.boards.size} Bretter seit dem Laden · Hände-Ansicht und Drilldown bleiben für
            Nacharbeit offen
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
        {tabs.map(([key, label, why]) => (
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
            title={why}
            variant={tab === key ? "default" : "outline"}
          >
            {label}
          </Button>
        ))}
        {error ? <Badge variant="destructive">{error}</Badge> : null}
      </div>

      <SessionPanel boards={boards} boardsDone={boardsDone} tally={tally} />

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
          queueNote="Hände einzeichnen"
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
              <Badge variant="secondary">Queue: {boardQueue.label}</Badge>
              <Button className="max-sm:h-11 max-sm:px-3" onClick={() => setBoardQueue(null)} size="sm" variant="outline">
                zurück zu allen {frames.length} Brettern
              </Button>
            </div>
          ) : null}
          <Drilldown
            accepts={boardQueue ? queued.accepts : undefined}
            decided={decided}
            frames={boardQueue ? queueFrames(boardQueue.hits) : frames}
            hits={boardQueue ? queued.hits : undefined}
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
