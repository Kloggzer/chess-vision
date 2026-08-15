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
        <details className="border-border bg-muted/20 rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer max-sm:min-h-11">
            <span className="font-medium">
              Zeigt das Foto die Stellung NACH diesem Commit? Ja → behalten, sonst verwerfen.
            </span>{" "}
            <span className="text-muted-foreground tabular-nums">
              {plyCount} Halbzüge auf {cards.length} Frames
            </span>
          </summary>
          <div className="text-muted-foreground mt-2 space-y-2">
            <p>
              Der Zug ist aufs Brett gezeichnet: gelb = von, grüner Pfeil → nach. Alles startet als
              verworfen. Die Feld-Labels im Bild sind nur die Vermutung des Trackers — traue den
              Holzfiguren, nicht dem Text.
            </p>
            <p>
              <Badge variant="secondary">Mehrfach-Commit</Badge>: mehrere Halbzüge auf einem Frame.
              Es gibt nur ein Bild und es zeigt die Endstellung — beurteile die. Die Halbzüge
              dazwischen tragen keine Frames und fallen beim Export weg.
            </p>
            <p>
              <Badge variant="secondary">fehlt auch im PGN</Badge>: meist ein echter Zug, der nach
              einem Resync SPÄT committet wurde. Dann ist das Brett schon weiter und verwerfen ist
              richtig. Im Zweifel verwerfen: ein verworfener Halbzug kostet ein paar Crops, ein
              falsch behaltener verdirbt ein ganzes Intervall.
            </p>
          </div>
        </details>
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
                  {card.duplicate ? <Badge variant="secondary">fehlt auch im PGN</Badge> : null}
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
                    title={multi ? `das Bild zeigt die Stellung nach ${sans.join(" + ")}` : "das Bild zeigt diesen Zug"}
                  >
                    behalten
                  </Button>
                  <Button
                    className="flex-1"
                    variant={isKept ? "outline" : "destructive"}
                    onClick={() => setKept((k) => ({ ...k, [card.id]: false }))}
                  >
                    verwerfen
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {gallery.length > 0 ? (
        <div className="space-y-3">
          <h2
            className="text-base font-semibold"
            title="Die Referenz verbürgt die ZÜGE, nicht die Bilder. Hand im Bild, verrutschter Ausschnitt, dunkler Müll? Dann taugt das Intervall nichts, egal wie sauber der Abgleich aussieht. Zu entscheiden gibt es hier nichts — nur zum Schauen."
          >
            Sichtprüfung{" "}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              {seenCount} Halbzüge decken sich mit reference.pgn
            </span>
          </h2>
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

      <div className="border-border flex flex-wrap items-center gap-4 rounded-lg border p-3">
        <Button
          disabled={state === "writing"}
          onClick={confirm}
          title="schreibt confirmed + reviewed_plies in candidate.json — sonst ändert sich nichts"
        >
          {cards.length > 0
            ? `Bestätigen — ${keptCount} von ${cards.length} behalten`
            : `Alle ${seenCount} gesehen — bestätigen`}
        </Button>
        {state === "idle" ? null : <span className="text-muted-foreground text-sm">{state}</span>}
      </div>

      {zoom ? <ZoomOverlay name={name} onClose={() => setZoom(null)} zoom={zoom} /> : null}
    </section>
  );
}
