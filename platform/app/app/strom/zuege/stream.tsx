"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FrameSeries, sequenceLabel, ZoomOverlay, type Zoom } from "@/app/confirm/board-frames";
import { Why } from "@/app/page-title";
import { Notice } from "@/components/notice";
import { ReferenceChip } from "@/components/reference-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReviewCard } from "@/lib/review-cards";
import { EXPORT_HOLD_MS, median, nextItem, prevItem, streamItems, type StreamGame } from "@/lib/zuege";
import { SHORT_HOLD } from "@/lib/review-cards";

/**
 * ZÜGE — every pending game's cards back to back, the game boundary a caption and a commit
 * (CONCEPT.md §4.1). The human never picks a game and never presses Confirm.
 *
 * `g` is the Sichtprüfung gallery of the current game and `.` opens `/game/<name>`: §4.1's table
 * hands `g` to both, and §3.1 gives the debug surface to `.` on any item.
 */
type Verdict = "keep" | "drop";
type Committed = { plies: number; until: number };
//: The NAME, never the index: `games` comes from the server and loses a game the moment it is
//: confirmed, while the toast outlives that render. An index then points past the end.
type Note =
  | { kind: "committed"; name: string; plies: number; until: number }
  | { kind: "undone"; name: string; dequeued: boolean }
  | { kind: "dropped"; name: string }
  | { kind: "reexport"; name: string }
  | { kind: "error"; text: string };

const without = <T,>(map: Record<number, T>, index: number): Record<number, T> =>
  Object.fromEntries(Object.entries(map).filter(([key]) => Number(key) !== index));

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
  return answer;
}

export function ZuegeStream({ games }: { games: StreamGame[] }) {
  const items = useMemo(() => streamItems(games), [games]);
  const [at, setAt] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Verdict>>({});
  const [dropped, setDropped] = useState<ReadonlySet<number>>(new Set<number>());
  const [committed, setCommitted] = useState<Record<number, Committed>>({});
  const [frameAt, setFrameAt] = useState<Record<string, number>>({});
  const [noted, setNoted] = useState<ReadonlySet<string>>(
    () => new Set(games.flatMap((g, i) => g.noted.map((ply) => `${i}:${ply}`))),
  );
  const [gaps, setGaps] = useState<number[]>([]);
  const [note, setNote] = useState<Note | null>(null);
  const [gallery, setGallery] = useState<number | null>(null);
  const [zoom, setZoom] = useState<Zoom | null>(null);
  /** Ticks the toast's countdown; nothing else in the page depends on the wall clock. */
  const [now, setNow] = useState(() => Date.now());
  const decidedAt = useRef<number | null>(null);

  const item = items[at] ?? null;
  const game = item ? games[item.game] : null;
  const key = item?.card ? `${item.game}:${item.card.id}` : null;
  const verdict = key ? decisions[key] : undefined;
  const done = at >= items.length;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** The boundary IS the write (§4.1.1) — plus the export it owns, held for 90 s. */
  async function commit(index: number, verdicts: Record<string, Verdict>) {
    const target = games[index];
    // An empty candidate has nothing to confirm: `Space` skips it, only `x` is a verdict. A game
    // whose every ply the reference vouched for HAS: the boundary writes the matched set.
    if (target.plies === 0) return;
    const kept = target.cards.filter((c) => verdicts[`${index}:${c.id}`] === "keep").flatMap((c) => c.keep);
    try {
      const answer = await post<{ reviewed_plies: number[] }>(`/api/zuege/${target.name}`, { action: "commit", kept });
      const until = Date.now() + EXPORT_HOLD_MS;
      setCommitted((c) => ({ ...c, [index]: { plies: answer.reviewed_plies.length, until } }));
      setNote({ kind: "committed", name: target.name, plies: answer.reviewed_plies.length, until });
    } catch (error) {
      setNote({ kind: "error", text: String(error) });
    }
  }

  function advance(verdicts: Record<string, Verdict> = decisions) {
    if (!item) return;
    if (item.last && !dropped.has(item.game) && committed[item.game] === undefined) void commit(item.game, verdicts);
    setAt(nextItem(items, at, dropped));
  }

  function decide(value: Verdict) {
    if (!key) return;
    const next = { ...decisions, [key]: value };
    setDecisions(next);
    // Median s/Zug, in memory and reset by a reload — §6.1 allows no other kind of counter.
    const stamp = Date.now();
    const previous = decidedAt.current;
    if (previous !== null) setGaps((g) => [...g, stamp - previous]);
    decidedAt.current = stamp;
    advance(next);
  }

  /**
   * `z` — one card back, across the boundary. Inside the hold the export is dequeued and nothing
   * ran; after it the session exists and only a re-export repairs it, which the toast says.
   */
  async function back() {
    const target = prevItem(items, at, dropped);
    if (target < 0) return;
    setAt(target);
    const index = items[target].game;
    const live = committed[index];
    if (!live) return;
    setCommitted((c) => without(c, index));
    const kept = games[index].cards
      .filter((c) => decisions[`${index}:${c.id}`] === "keep")
      .flatMap((c) => c.keep);
    try {
      const answer = await post<{ dequeued: boolean }>(`/api/zuege/${games[index].name}`, { action: "undo", kept });
      setNote({ kind: "undone", name: games[index].name, dequeued: answer.dequeued });
    } catch (error) {
      // Die Bestaetigung steht noch: sie hier zu vergessen heisst, dass das naechste Vorwaerts
      // erneut committet und der gehaltene Export unbemerkt weiterlaeuft.
      setCommitted((c) => ({ ...c, [index]: live }));
      setNote({ kind: "error", text: String(error) });
    }
  }

  /** `x` — the recording is out. No `writeConfirmation`, and its buffered keeps die with it. */
  async function throwOut() {
    if (!item || !game) return;
    const index = item.game;
    const rest = Object.fromEntries(Object.entries(decisions).filter(([k]) => !k.startsWith(`${index}:`)));
    const next = new Set(dropped);
    next.add(index);
    const held = committed;
    setDecisions(rest);
    setDropped(next);
    setCommitted((c) => without(c, index));
    setAt(nextItem(items, at, next));
    setNote({ kind: "dropped", name: games[index].name });
    try {
      await post(`/api/useless/${game.name}`, { useless: true, reason: "Züge-Strom: x" });
      // A boundary that already fired has an export on hold; the flag must take that back too.
      if (committed[index]) await post(`/api/zuege/${game.name}`, { action: "release" });
    } catch (error) {
      // Zurueck an den Platz: die Aufnahme blieb sonst den Rest der Sitzung weg, waehrend auf der
      // Platte kein Flag steht und der gehaltene Export weiterlaeuft.
      setDecisions(decisions);
      setDropped(dropped);
      setCommitted(held);
      setAt(at);
      setNote({ kind: "error", text: String(error) });
    }
  }

  async function flagInterval() {
    if (!item?.card || !game) return;
    const ply = item.card.plies[0].ply;
    try {
      await post(`/api/zuege/${game.name}/note`, { ply });
      setNoted((n) => new Set(n).add(`${item.game}:${ply}`));
    } catch (error) {
      setNote({ kind: "error", text: String(error) });
    }
  }

  async function reexport(name: string) {
    try {
      await post(`/api/zuege/${name}`, { action: "reexport" });
      setNote({ kind: "reexport", name });
    } catch (error) {
      setNote({ kind: "error", text: String(error) });
    }
  }

  const stepFrames = (delta: number) => {
    if (!item?.card || !key) return;
    const stems = item.card.stems.length;
    const current = frameAt[key] ?? item.card.start;
    setFrameAt((f) => ({ ...f, [key]: Math.max(0, Math.min(stems - 1, current + delta)) }));
  };

  // The handler reads a lot of state, so the listener is registered ONCE and looks the current one
  // up through a ref — re-binding it per keystroke-relevant state change is how keys get lost.
  const handler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (zoom) {
      if (event.key === "Escape") setZoom(null);
      return;
    }
    if (gallery !== null) {
      if (event.key === "Escape") setGallery(null);
      return;
    }
    if (event.key === "z") return void back();
    if (done) return;
    switch (event.key) {
      case "k":
        event.preventDefault();
        return item?.card ? decide("keep") : undefined;
      case " ":
      case "j":
        event.preventDefault();
        return item?.card ? decide("drop") : advance();
      case "ArrowLeft":
        event.preventDefault();
        return stepFrames(-1);
      case "ArrowRight":
        event.preventDefault();
        return stepFrames(1);
      case "x":
        event.preventDefault();
        return void throwOut();
      case "g":
        event.preventDefault();
        return setGallery(item?.game ?? null);
      case ".":
        event.preventDefault();
        if (game) window.open(`/game/${game.name}`, "_blank", "noopener");
        return;
      default:
        return;
    }
  };
  // No dependency array: the listener above reads THIS render's closure through the ref.
  useEffect(() => {
    handler.current = onKey;
  });

  const kept = Object.values(decisions).filter((v) => v === "keep").length;
  const drops = Object.values(decisions).filter((v) => v === "drop").length;
  const seconds = median(gaps);
  const open = games.length - dropped.size - Object.keys(committed).length;
  const first = item?.card?.plies[0];
  const notedHere = first ? noted.has(`${item.game}:${first.ply}`) : false;

  return (
    <section className="space-y-4">
      <header className="border-border flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <span className="text-foreground text-sm font-medium tabular-nums">
          {Math.min(at + 1, items.length)}/{items.length}{" "}
          <span className="text-muted-foreground text-xs font-normal">Karten</span>
        </span>
        <span className="text-muted-foreground tabular-nums">{Math.max(open, 0)} Partien offen</span>
        <Why>
          Jede offene Partie, Karte für Karte: Zeigt das Foto die Stellung NACH diesem Zug? k
          behalten, Leertaste verwerfen (Zweifel = verwerfen). Am Partieende schreibt der Strom die
          Bestätigung selbst — 90 s lang macht z sie kostenlos rückgängig.
        </Why>
        {game ? (
          <>
            <span className="text-muted-foreground truncate font-mono">
              {game.title ?? game.name} · {game.plies} Halbzüge
              {first ? ` · Halbzug ${first.ply}` : ""}
              {item?.card ? ` · @${String(item.card.frame).padStart(6, "0")}` : ""}
            </span>
            <ReferenceChip origin={game.reference} />
            {game.referenceProblem ? (
              <span className="text-destructive">reference.pgn unlesbar: {game.referenceProblem}</span>
            ) : null}
          </>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground ml-auto tabular-nums">
              {seconds === null ? "— s/Zug" : `${(seconds / 1000).toFixed(1)} s/Zug`}
            </span>
          </TooltipTrigger>
          <TooltipContent>Median seit dem Laden</TooltipContent>
        </Tooltip>
      </header>

      {done ? (
        <p className="text-muted-foreground text-sm">
          Durch — nichts wartet mehr auf ein Urteil. <code>z</code> geht zurück.
        </p>
      ) : game && item?.card ? (
        <CardBody
          at={frameAt[key ?? ""] ?? item.card.start}
          card={item.card}
          name={game.name}
          onZoom={setZoom}
          step={stepFrames}
          verdict={verdict}
        />
      ) : game ? (
        <EmptyCandidate name={game.name} plies={game.plies} />
      ) : null}

      {!done ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button className="max-sm:h-11" disabled={!item?.card} onClick={() => decide("keep")}>
            k behalten
          </Button>
          <Button
            className="max-sm:h-11"
            onClick={() => (item?.card ? decide("drop") : advance())}
            variant="outline"
          >
            ⎵ {item?.card ? "verwerfen" : (game?.plies ?? 0) > 0 ? "bestätigen" : "überspringen"}
          </Button>
          <Button className="max-sm:h-11" onClick={() => void throwOut()} variant="destructive">
            x Partie raus{item?.card || (game?.plies ?? 0) > 0 ? "" : " (empfohlen)"}
          </Button>
          <Button className="max-sm:h-11" onClick={() => void back()} variant="outline">
            z zurück
          </Button>
          <Button className="max-sm:h-11" onClick={() => setGallery(item?.game ?? null)} variant="outline">
            g Sichtprüfung
          </Button>
          {game ? (
            <Link
              className="border-border text-muted-foreground inline-flex items-center rounded border px-3 text-sm underline-offset-4 hover:underline max-sm:h-11 max-sm:px-3"
              href={`/game/${game.name}`}
              target="_blank"
            >
              . Debug
            </Link>
          ) : null}
          {item?.card ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <button
                    className="text-muted-foreground ml-auto cursor-pointer text-xs underline underline-offset-4 disabled:opacity-50"
                    disabled={notedHere}
                    onClick={() => void flagInterval()}
                    type="button"
                  >
                    {notedHere ? "Intervall vermerkt" : "Intervall taugt nichts"}
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Hand im Bild, verrutschter Ausschnitt, dunkler Müll? Der Halbzug bleibt behaltbar — das Urteil gilt dem BILD (review-notes.jsonl)</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ) : null}

      {note ? <Toast note={note} now={now} onReexport={reexport} /> : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <footer className="text-muted-foreground text-xs tabular-nums">
            {kept + drops} Karten · {kept} behalten · {drops} verworfen · {dropped.size}{" "}
            {dropped.size === 1 ? "Partie" : "Partien"} raus
          </footer>
        </TooltipTrigger>
        <TooltipContent>diese Sitzung, in memory — ein Reload setzt sie zurück</TooltipContent>
      </Tooltip>

      {gallery !== null ? (
        <Gallery game={games[gallery]} onClose={() => setGallery(null)} onZoom={setZoom} />
      ) : null}
      {zoom && game ? <ZoomOverlay name={game.name} onClose={() => setZoom(null)} zoom={zoom} /> : null}
    </section>
  );
}

/** The one card under the question, with the badges the confirm page taught the human to read. */
function CardBody({
  name,
  card,
  at,
  step,
  verdict,
  onZoom,
}: {
  name: string;
  card: ReviewCard;
  at: number;
  step: (delta: number) => void;
  verdict: "keep" | "drop" | undefined;
  onZoom: (zoom: Zoom) => void;
}) {
  const multi = card.plies.length > 1;
  const sans = card.plies.map((p) => p.san);
  return (
    <article className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
        {sequenceLabel(card)}
        {card.decider === "cnn_recovery" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Badge variant="secondary">
                  spät committet (recovery)
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>Recovery = der Tracker hat den Zug NACHTRÄGLICH aufgeholt. Das Foto zeigt oft schon spätere Züge — dann verwerfen.</TooltipContent>
          </Tooltip>
        ) : null}
        {multi || card.collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Badge variant="secondary">
                  Mehrfach-Commit: Bild zeigt die Endstellung
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>Mehrere Halbzüge auf einem Frame — es gibt nur EIN Bild, und es zeigt die Stellung nach allen.</TooltipContent>
          </Tooltip>
        ) : null}
        {!card.carriesFrames ? <Badge variant="secondary">trägt 0 Frames bei</Badge> : null}
        {card.held !== null && card.held < SHORT_HOLD ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Badge variant="destructive">Stellung stand nur {card.held} Frames</Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Der nächste Commit kam {card.held} Frames später — schneller, als eine Hand zieht. Das Handy hat spät committet, das Bild zeigt meist schon den nächsten Zug: verwerfen.
            </TooltipContent>
          </Tooltip>
        ) : null}
        {card.duplicate ? <Badge variant="secondary">fehlt auch im PGN</Badge> : null}
        {verdict ? <Badge variant={verdict === "keep" ? "default" : "outline"}>zuletzt: {verdict}</Badge> : null}
      </div>
      <div className="mx-auto flex max-w-3xl items-start justify-center gap-3">
        {card.before ? (
          <figure className="w-64 shrink-0 space-y-1 max-sm:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- same raw review frame the series shows */}
            <img
              alt={`Stellung vor ${sans[0]}`}
              className="w-full rounded border opacity-90"
              src={`/api/frame/${name}/${card.before.stem}`}
            />
            <figcaption className="text-muted-foreground text-center font-mono text-xs">
              vorher · frame {card.before.stem}
            </figcaption>
          </figure>
        ) : null}
        <div className="max-w-lg flex-1 space-y-2">
          <FrameSeries at={at} card={card} name={name} onZoom={onZoom} priority step={step} />
        </div>
      </div>
      <p className="text-sm">
        Zeigt das Foto die Stellung <strong>NACH</strong> {multi ? `der Sequenz ${sans.join(" + ")}` : "diesem Zug"}?
        Im Zweifel verwerfen.
        {card.before ? " Links steht, wovon der Zug ausging." : null}
      </p>
    </article>
  );
}

/** No card to judge: the replay read nothing (§4.1), or an independent reference vouched for every ply. */
function EmptyCandidate({ name, plies }: { name: string; plies: number }) {
  return (
    <article className="border-border space-y-2 rounded-lg border p-4">
      <p className="font-mono text-sm">{name}</p>
      {plies === 0 ? (
        <p className="text-sm">
          0 Halbzüge gelesen. Nichts zu bestätigen — <strong>x</strong> raus (empfohlen),{" "}
          <strong>Space</strong> überspringen, <strong>.</strong> Job-Log ansehen.
        </p>
      ) : (
        <p className="text-sm">
          Alle {plies} Halbzüge decken sich mit reference.pgn — nichts offen. <strong>Space</strong> bestätigt die Partie,{" "}
          <strong>g</strong> zeigt die Bilder trotzdem.
        </p>
      )}
    </article>
  );
}

/** §4.1.1's inline confirmation, with the countdown that says how long the undo stays free. */
function Toast({
  note,
  now,
  onReexport,
}: {
  note: Note;
  now: number;
  onReexport: (name: string) => void;
}) {
  if (note.kind === "error") return <Notice tone="error">{note.text}</Notice>;
  const name = note.name;
  if (note.kind === "committed") {
    const left = Math.max(0, Math.ceil((note.until - now) / 1000));
    return (
      <p className="text-muted-foreground text-sm">
        bestätigt — {note.plies} reviewed plies · <code>z</code> macht es rückgängig{" "}
        <span className="tabular-nums">{left > 0 ? `(${left} s)` : "· Export läuft"}</span>
      </p>
    );
  }
  if (note.kind === "undone") {
    return note.dequeued ? (
      <p className="text-muted-foreground text-sm">zurückgenommen — der Export lief nie.</p>
    ) : (
      <p className="text-sm">
        Export läuft bereits — <code>data/recordings/{name}/</code> muss neu exportiert werden.{" "}
        <Button className="ml-2 max-sm:h-11" onClick={() => onReexport(note.name)} size="sm" variant="outline">
          neu exportieren
        </Button>
      </p>
    );
  }
  if (note.kind === "reexport") return <p className="text-muted-foreground text-sm">{name}: Export neu angestoßen.</p>;
  return <p className="text-muted-foreground text-sm">{name} ist raus (nutzlos) — nichts wurde bestätigt.</p>;
}

/**
 * `g` — the game's Sichtprüfung: the plies the reference already vouched for, same windows, no
 * verdict. A clean LCS says nothing about hands, crops or dark frames (§8c).
 */
function Gallery({
  game,
  onClose,
  onZoom,
}: {
  game: StreamGame;
  onClose: () => void;
  onZoom: (zoom: Zoom) => void;
}) {
  const [frameAt, setFrameAt] = useState<Record<number, number>>({});
  return (
    <div className="bg-background/95 fixed inset-0 z-40 overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">Sichtprüfung {game.name}</span>
          <span className="text-muted-foreground">
            {game.gallery.reduce((n, c) => n + c.plies.length, 0)} Halbzüge decken sich mit reference.pgn
          </span>
          <ReferenceChip origin={game.reference} />
          <Button className="ml-auto max-sm:h-11" onClick={onClose} size="sm" variant="outline">
            Esc zurück
          </Button>
        </div>
        {game.gallery.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine gematchten Halbzüge — es gibt nichts zu blättern.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {game.gallery.map((card) => {
              const at = frameAt[card.id] ?? card.start;
              return (
                <div className="border-border space-y-2 rounded-lg border p-2 text-xs" key={card.id}>
                  <div className="font-mono">{sequenceLabel(card)}</div>
                  <FrameSeries
                    at={at}
                    card={card}
                    name={game.name}
                    onZoom={onZoom}
                    step={(delta) =>
                      setFrameAt((f) => ({
                        ...f,
                        [card.id]: Math.max(0, Math.min(card.stems.length - 1, at + delta)),
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
