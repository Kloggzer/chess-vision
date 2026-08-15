"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FrameSeries, sequenceLabel, ZoomOverlay, type Zoom } from "@/app/confirm/board-frames";
import type { ReviewCard } from "@/lib/review-cards";

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
                      title="Dieser Commit besitzt kein Intervall — der nächste Commit liegt auf demselben Frame. Er trägt 0 Frames zum Export bei."
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

      {zoom ? <ZoomOverlay name={name} onClose={() => setZoom(null)} zoom={zoom} /> : null}
    </section>
  );
}
