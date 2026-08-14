"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { MoveSquares, ReviewCard } from "@/lib/review-cards";

/** What a click on a picture opens full-screen. */
type Zoom = { stem: string; height: number; squares: MoveSquares[] };

/**
 * The claimed move(s), drawn ONTO the rectified board so the human answers yes/no by looking.
 * The review PNG is 720x816 with the board as the top 720x720 and a8 at the top-left, so a
 * square is a plain 90 px grid cell; the SVG shares the image's viewBox and scales with it.
 * A multi-commit draws every half of the sequence — the picture shows the end of all of them.
 */
function MoveOverlay({
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
function sequenceLabel(card: ReviewCard): string {
  const sans = card.plies.map((p) => p.san);
  if (card.plies.length === 1) return `ply ${card.plies[0].ply} ${sans[0]}`;
  return `Plies ${card.plies[0].ply}–${card.plies[card.plies.length - 1].ply}: ${sans.join(" + ")}`;
}

/**
 * The commit's frame window with its pager — the same series for a judged card and a viewed one.
 * A commit can anchor mid-hand (a verify or pair commit, or a blitz reply already arriving), so
 * ONE picture is sometimes a hand and nothing else; the human steps through what exists.
 */
function FrameSeries({
  name,
  card,
  at,
  step,
  onZoom,
}: {
  name: string;
  card: ReviewCard;
  at: number;
  step: (delta: number) => void;
  onZoom: (zoom: Zoom) => void;
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
          sizes="(min-width: 768px) 45vw, 90vw"
          src={`/api/frame/${name}/${entry.stem}`}
          unoptimized
        />
        <MoveOverlay height={height} squares={squares} />
      </button>
      {card.stems.length > 1 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
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
            frame {entry.stem} ({offset >= 0 ? "+" : ""}
            {offset}) · {at + 1}/{card.stems.length}
          </span>
        </div>
      ) : null}
    </>
  );
}

export function ConfirmReview({
  name,
  cards,
  gallery,
}: {
  name: string;
  /** The plies that disagree with the reference — one card per commit frame, with a verdict. */
  cards: ReviewCard[];
  /** The plies the reference already vouched for — same series, read-only. */
  gallery: ReviewCard[];
}) {
  const [kept, setKept] = useState<Record<number, boolean>>({});
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [state, setState] = useState<"idle" | "writing" | string>("idle");
  /** Which of a card's stems is showing, keyed by card id — judged and viewed ids never collide. */
  const [frameAt, setFrameAt] = useState<Record<number, number>>({});

  async function confirm() {
    setState("writing");
    const res = await fetch(`/api/confirm/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // A card can decide several plies; it posts the ones that own an interval, so the wire
      // stays what it always was — indices into the candidate's own move list. The gallery is a
      // viewing layer and contributes nothing: the matched plies are the server's to add.
      body: JSON.stringify({ kept: cards.filter((c) => kept[c.id]).flatMap((c) => c.keep) }),
    });
    const body = await res.json();
    setState(res.ok ? `confirmed — ${body.reviewed_plies.length} reviewed plies` : `error: ${body.error}`);
  }

  const keptCount = cards.filter((c) => kept[c.id]).length;
  const plyCount = cards.reduce((n, c) => n + c.plies.length, 0);
  const seenCount = gallery.reduce((n, c) => n + c.plies.length, 0);
  const stepper = (id: number, stems: number, at: number) => (delta: number) =>
    setFrameAt((f) => ({ ...f, [id]: Math.max(0, Math.min(stems - 1, at + delta)) }));

  return (
    <section className="space-y-4">
      {cards.length > 0 ? (
        <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-4 text-sm">
          <p className="font-medium">Your call, one commit at a time:</p>
          <p className="text-muted-foreground">
            The tracker committed these {plyCount} moves on {cards.length} frames, but they do not
            line up with the reference game. The claimed move is DRAWN on each board: yellow =
            from, green arrow → to. One question per card:{" "}
            <strong className="text-foreground">
              does the photo show the position right AFTER this commit?
            </strong>{" "}
            Yes → KEEP (it enters the label timeline). No → DROP. Everything starts as DROP; the
            square labels on the picture are only the tracker&apos;s belief — trust the wooden
            pieces, not the text. Click any picture to enlarge.
          </p>
          <p className="text-muted-foreground">
            <Badge variant="secondary">Mehrfach-Commit</Badge>: a recovery bridge or a pair lands
            SEVERAL halves on one frame. There is only one picture for them and it shows the
            position after the whole sequence, so they share one card — judge the end position.
            The halves in between carry no frames and drop out of the export by themselves.
          </p>
          <p className="text-muted-foreground">
            <Badge variant="secondary">also missed in PGN</Badge>: the same move also appears as
            missing from the reference — usually a real move committed LATE after a resync. Late
            means the board has already moved on, so the photo will NOT match and DROP is
            typically right. When in doubt, drop: a dropped ply costs a few crops, a wrongly kept
            one mislabels a whole interval.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const isKept = !!kept[card.id];
          const at = frameAt[card.id] ?? card.start;
          const multi = card.plies.length > 1;
          const sans = card.plies.map((p) => p.san);
          const first = card.plies[0];
          const last = card.plies[card.plies.length - 1];
          return (
            <Card key={card.id} className={isKept ? "border-green-600" : "border-red-900/60"}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-base">
                  {multi ? (
                    <>
                      Plies {first.ply}–{last.ply}: {sans.join(" + ")}
                    </>
                  ) : (
                    <>
                      ply {first.ply} {first.san}
                      {first.squares ? (
                        <span className="text-muted-foreground text-xs">
                          {first.squares.from} → {first.squares.to}
                        </span>
                      ) : null}
                    </>
                  )}
                  <span className="text-muted-foreground text-xs">@frame {card.frame}</span>
                  {card.decider === "cnn_recovery" ? (
                    <Badge
                      title="Recovery = der Tracker hat den Zug NACHTRÄGLICH aufgeholt. Das Foto zeigt oft schon spätere Züge — dann drop; keep nur, wenn es exakt die Stellung nach DIESEM Commit zeigt."
                      variant="secondary"
                    >
                      spät committet (recovery)
                    </Badge>
                  ) : null}
                  {multi ? (
                    <Badge
                      title="Mehrere Halbzüge auf einem Frame — es gibt nur EIN Bild dafür, und es zeigt die Stellung nach allen. KEEP verbürgt genau diese Endstellung."
                      variant="secondary"
                    >
                      Mehrfach-Commit: {card.plies.length} Halbzüge, Bild zeigt die Endstellung
                    </Badge>
                  ) : null}
                  {card.group.length > card.plies.length ? (
                    <Badge
                      title="Weitere Halbzüge auf demselben Frame stehen nicht zur Prüfung — die hat der Abgleich mit der Referenz schon gematcht."
                      variant="secondary"
                    >
                      {card.group.length} Halbzüge @{card.frame}: {card.group.join(" + ")}
                    </Badge>
                  ) : null}
                  {!card.carriesFrames ? (
                    <Badge
                      title="Dieser Commit besitzt kein Intervall — der nächste Commit liegt auf demselben Frame oder es gibt keinen mehr. Er trägt 0 Frames zum Export bei."
                      variant="secondary"
                    >
                      trägt 0 Frames bei
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
                {multi ? (
                  <p className="text-muted-foreground text-sm">
                    Das Bild zeigt die Stellung NACH der ganzen Sequenz ({sans.join(" + ")}) — die
                    Zwischenstellung wurde nie fotografiert. Beurteile nur die Endstellung: die
                    Halbzüge davor tragen keine Frames und fallen beim Export von selbst weg.
                  </p>
                ) : null}
                <FrameSeries
                  at={at}
                  card={card}
                  name={name}
                  onZoom={setZoom}
                  step={stepper(card.id, card.stems.length, at)}
                />
                {card.stems.length > 1 ? (
                  <p className="text-muted-foreground text-xs">
                    Hand im Bild? Weiterblättern — jedes Bild zeigt dieselbe Stellung.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={isKept ? "default" : "outline"}
                    onClick={() => setKept((k) => ({ ...k, [card.id]: true }))}
                  >
                    {multi
                      ? `keep — the picture shows the position after ${sans.join(" + ")}`
                      : "keep — the picture shows this move"}
                  </Button>
                  <Button
                    className="flex-1"
                    variant={isKept ? "outline" : "destructive"}
                    onClick={() => setKept((k) => ({ ...k, [card.id]: false }))}
                  >
                    drop
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {gallery.length > 0 ? (
        <div className="space-y-3">
          <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-4 text-sm">
            <p className="font-medium">
              Sichtprüfung: {seenCount} Halbzüge decken sich mit reference.pgn
            </p>
            <p className="text-muted-foreground">
              Die Referenz verbürgt die ZÜGE, nicht die Bilder. Hier ist jede Commit-Serie zum
              Durchblättern — Hand im Bild, verrutschter Ausschnitt, dunkler Müll? Dann taugt das
              Intervall nichts, egal wie sauber der Abgleich aussieht. Nichts zu entscheiden: diese
              Halbzüge gehen so oder so in die Label-Timeline, das hier ist nur zum Schauen.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gallery.map((card) => {
              const at = frameAt[card.id] ?? card.start;
              return (
                <div
                  key={card.id}
                  className="border-border space-y-2 rounded-lg border p-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    {sequenceLabel(card)}
                    <span className="text-muted-foreground">@frame {card.frame}</span>
                  </div>
                  <FrameSeries
                    at={at}
                    card={card}
                    name={name}
                    onZoom={setZoom}
                    step={stepper(card.id, card.stems.length, at)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="border-border flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <Button disabled={state === "writing"} onClick={confirm} size="lg">
          {cards.length > 0
            ? `Confirm: keep ${keptCount} of ${cards.length}, drop the rest`
            : `Alle ${seenCount} gesehen — bestätigen`}
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
