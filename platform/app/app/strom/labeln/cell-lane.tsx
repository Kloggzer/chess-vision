"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { CROP, CropGrid, PAGE } from "@/components/crop-grid";
import { BoardPeek } from "@/components/board-peek";
import { PaletteRow } from "@/components/palette-row";
import type { Correction } from "@/lib/corrections";
import type { FrameHand } from "@/lib/frame-hands";
import type { StreamSession } from "@/lib/label-stream";
import { DIRTY_BRUSH, DIRTY_KEY, dirtyOnPage } from "@/lib/dirty-frames";
import { pagesByClaim } from "@/lib/lane-pages";
import { UNUSABLE_BRUSH, UNUSABLE_KEY, cellCoverage, handBeside, handsUnmeasured, type LaneCell } from "@/lib/lanes";
import { turnPage } from "@/lib/page-turn";
import { matteOverlay } from "@/lib/hand-overlay";
import { standingSquares } from "@/lib/setup-swap";
import { modelPickable, pageClaim, pageCounts } from "./page-head";
import type { Flush, LaneActions, Verdict } from "./stream";

export type CellLaneProps = {
  cells: LaneCell[];
  sessions: StreamSession[];
  decided: Record<string, string>[];
  /** Per session, `stem -> {square: coverage}` — a page mixes frames, so the lookup is per cell. */
  coverage: Record<string, Record<string, number> | undefined>[];
  /** Per session, `stem -> Hand am BRETT` — die Marke, die dem Crop nicht anzusehen ist. */
  frameHands: Record<string, FrameHand>[];
  /** Je Aufnahme: lief der Hand-Scan ueberhaupt? Ohne ihn ist ein fehlender Stem keine Aussage. */
  handScanned: boolean[];
  at: number;
  onAt: (at: number) => void;
  /** Gemeldete Frames als `session|stem` — die Marke hängt am Frame, nicht am Zellindex. */
  reported: ReadonlySet<string>;
  onDirty: (cell: LaneCell, on: boolean) => void;
  /** Der Dirty-Pinsel: die Zellen, deren FRAME als dirty gemeldet werden soll. */
  onDirtyCells: (cells: LaneCell[]) => void;
  /** Die Zellen, aus denen kein Label zu holen ist — eigenes Ledger, nie `corrections.jsonl`. */
  onUnusable: (cells: LaneCell[]) => void;
  /** Auch die schon beurteilten Zellen zeigen — die Nachkorrektur des Stroms. */
  showDone: boolean;
  actionsRef: RefObject<LaneActions>;
  onFlush: Flush;
};

const TOUCH = "max-sm:h-11 max-sm:px-3";
const keyOf = (c: LaneCell) => `${c.session}|${c.stem}|${c.square}`;

/**
 * OHNE Pinsel heißt der Klick weiter „unsicher" — er schreibt nichts, die Zelle kommt wieder;
 * `MODEL` schreibt das Wort des Modells. `MATTE` ist keine dritte Farbe, sondern eine ZWEITE
 * ACHSE: Label und Coverage sind unabhängig, also darf eine Zelle korrigiert UND zur Neumessung
 * gemeldet sein — genau das Paar, das `slice_session` erwartet (dirty + benannte Zelle).
 */
const UNSURE = "";
const MODEL = "modell";
const MATTE = DIRTY_BRUSH;
/** Die dritte Nicht-Klasse: „kein Label zu holen" — Glanz, Schmier, Figur ueber zwei Feldern. */
const USELESS = UNUSABLE_BRUSH;
const isClass = (v: string | undefined): v is string =>
  v !== undefined && v !== UNSURE && v !== MODEL && v !== MATTE && v !== USELESS;

/** Das stehende Urteil gehoert auf die Karte, sonst malt man im Nachlauf gegen ein unsichtbares. */
function noteOf(cell: LaneCell, verdict: string | undefined): { note?: string } {
  const text = [cell.note, verdict === undefined ? null : `✓ ${verdict}`].filter(Boolean).join(" · ");
  return text ? { note: text } : {};
}

/** Die Brett-Hand, wie die Karte sie trägt — `here` heißt: die Rillen nennen dieses Feld mit. */
function handMark(hand: FrameHand | null, square: string) {
  return hand ? { boardHand: { gate: hand.gate, squares: hand.grid, here: hand.grid.includes(square) } } : {};
}

/** What one cell of the page carries before it is written: a class, or one of the two non-classes. */
type Picks = Record<number, string>;

/**
 * A cell lane, rendered as the bucket grid the buckets already were (REVIEW S10). A page is one
 * keypress, grouped BY SQUARE — a handful of squares at a few moments each, not six scattered
 * crops of the same one. The palette loads a BRUSH like the board's: a click paints the armed
 * class, and one Enter writes the page.
 */
export function CellLane(props: CellLaneProps) {
  const { cells, sessions, decided, coverage, frameHands, handScanned, at, onAt, reported, onDirty, onDirtyCells,
    onUnusable, showDone, actionsRef, onFlush } = props;
  const [brush, setBrush] = useState<string>(UNSURE);
  // Die Lupe: ein WERKZEUG, kein Dauerzustand — sonst deckt die Tafel den Blick auf das Raster ab,
  // sobald der Zeiger nur vorbeizieht. Ohne sie kostet der Hover nichts.
  const [peek, setPeek] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [pick, setPick] = useState<Picks>({});
  /** Ein Batch pro Enter/Backspace — „zurück" holt seine UNBESCHRIEBENEN Zellen an ihre Position. */
  const [trail, setTrail] = useState<string[][]>([]);
  const [cursor, setCursor] = useState(0);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set<string>());
  /** Die ZWEITE Achse: das Label gilt der Zelle, die Hand dem Frame — beides zugleich ist erlaubt. */
  const [remeasure, setRemeasure] = useState<ReadonlySet<string>>(new Set<string>());
  /** Gemalt als „unbrauchbar" — die Zelle verlaesst den Klassifikations-Schreibweg ganz. */
  const [useless, setUseless] = useState<ReadonlySet<string>>(new Set<string>());
  /** Von „zurück" wieder hergeholt: die Zelle steht im Ledger und wird trotzdem noch mal gezeigt. */
  const [revived, setRevived] = useState<ReadonlySet<string>>(new Set<string>());
  const [page, setPage] = useState(() => Math.floor(at / PAGE));

  /** Das Urteil, das auf der Platte steht — `undefined` heisst offen. */
  const verdictOf = useCallback(
    (c: LaneCell) => (decided[c.session] ?? {})[`${c.stem}|${c.square}`],
    [decided],
  );
  /** Felder, die diese Aufnahme durchgehend anders nennt — dort ist die Vorbelegung falsch.
   *  Gemessen 2026-09-17: 65 Zellen trugen so den getauschten Namen (b8/c8, f1/g1). */
  const standing = useMemo(
    () => new Map(Object.entries(decided).map(([s, d]) => [Number(s), standingSquares(d)])),
    [decided],
  );
  /** ⏎ bestaetigt die Seite, wie sie dasteht (Nutzer, 2026-09-17: "alles andere ist ein extra
   *  schritt"). Diese Felder werden darum GEZEIGT, nicht zurueckgehalten — eine Wache, die dem
   *  Menschen nur Klicks abverlangt, wird umgangen und schuetzt dann gar nichts. */
  const contested = useCallback(
    (c: LaneCell) => {
      const seen = standing.get(c.session)?.get(c.square);
      return seen !== undefined && seen.label !== c.label;
    },
    [standing],
  );
  const open = useMemo(
    () =>
      cells.filter((c) => {
        const key = keyOf(c);
        if (skipped.has(key)) return false;
        return showDone || revived.has(key) || verdictOf(c) === undefined;
      }),
    [cells, revived, showDone, skipped, verdictOf],
  );
  // Eine Seite traegt EINE Klasse: der Schnitt faellt an der Klassengrenze, nicht alle 50 Karten.
  const book = useMemo(() => pagesByClaim(open, PAGE), [open]);
  const pages = Math.max(1, book.length);
  const safePage = Math.min(page, pages - 1);
  const slice = useMemo(() => book[safePage] ?? [], [book, safePage]);
  /**
   * Die Behauptung dieser Seite. Wechselt sie, hält eine Sperre den Strom an: im Rhythmus klickt
   * man sonst die alte Antwort auf die neue Frage, und das schreibt Labels, die niemand meinte.
   */
  const claim = [...new Set(slice.map((c) => c.fen_label))].join(" · ") || "—";
  const [seen, setSeen] = useState(claim);
  const shifted = claim !== seen;

  // Die nächste Seite wird vorgewärmt, während geurteilt wird: die Crops entstehen serverseitig,
  // und der Umblätter-Moment war die spürbare Wartezeit (User, 2026-08-15). 1-h-Cache trägt sie.
  useEffect(() => {
    const next = book[safePage + 1] ?? [];
    for (const c of next) {
      const img = new window.Image();
      img.src = `/api/cell/${sessions[c.session].name}/${c.stem}/${c.square}?size=${CROP}`;
    }
  }, [book, safePage, sessions]);

  const rows = useCallback(
    (list: { cell: LaneCell; label: string }[]): Correction[] =>
      list.map(({ cell, label }) => ({
        session_id: sessions[cell.session].sessionId,
        frame: cell.stem,
        square: cell.square,
        label,
      })),
    [sessions],
  );
  const priorOf = useCallback(
    (list: LaneCell[]) =>
      Object.fromEntries(
        list.map((c) => [
          `${sessions[c.session].sessionId}|${c.stem}|${c.square}`,
          (decided[c.session] ?? {})[`${c.stem}|${c.square}`],
        ]),
      ),
    [decided, sessions],
  );

  const clear = () => {
    setPick({});
    setCursor(0);
  };

  // `pick` ist nach dem Index INNERHALB der Seite gekeyt: nur `setPage` zu setzen liess die Farbe
  // der alten Seite auf den neuen Zellen stehen, und ⏎ schrieb sie.
  const goPage = (delta: number) => {
    const next = turnPage({ page: safePage, picks: pick, cursor }, delta, pages);
    setPage(next.page);
    setPick(next.picks);
    setCursor(next.cursor);
  };

  const counts = useMemo(
    () =>
      pageCounts(
        slice.map((c, i) => ({
          pick: isClass(pick[i]) ? "class" : pick[i] === MODEL ? "model" : pick[i] === UNSURE ? "unsure" : undefined,
          judged: verdictOf(c) !== undefined,
          useless: useless.has(keyOf(c)),
          hasModel: c.exception !== null,
        })),
      ),
    [pick, slice, useless, verdictOf],
  );
  /** Die Felder dieser Seite, die ihre Aufnahme sonst anders nennt — als WARNUNG, nicht als Sperre. */
  const warned = useMemo(
    () => [...new Set(slice.filter(contested).map((c) => c.square))].sort(),
    [contested, slice],
  );

  /**
   * Enter writes the page: what the brush painted, the exceptions the model won, and for every
   * untouched cell the lane's own default. Unsicher schreibt NICHTS — ohne Ledger-Zeile kommt die
   * Zelle bei der nächsten Sitzung wieder, genau die versprochene spätere Aufbereitung.
   */
  const accept = useCallback(async () => {
    if (slice.length === 0 || shifted) return;
    // Eine schon beurteilte Zelle, die niemand angefasst hat, schreibt NICHTS: die Vorbelegung
    // wuerde sonst eine frueher gemalte Korrektur mit dem FEN-Wort ueberschreiben, sobald man die
    // Seite nur noch einmal ansieht.
    // Eine unbrauchbare Zelle bekommt KEINE Klassenzeile — sie ist beantwortet, nur nicht mit
    // einem Label. Sonst schriebe die Vorbelegung genau das Label, das der Mensch verneint hat.
    const junk = slice.filter((c) => useless.has(keyOf(c)));
    const live = slice.filter((c) => !useless.has(keyOf(c)));
    const taken = live.filter((c) => pick[slice.indexOf(c)] === undefined && verdictOf(c) === undefined);
    const writes: Verdict[] = [
      {
        rows: rows([
          ...taken.filter((c) => c.ledger === "corrections").map((cell) => ({ cell, label: cell.label })),
          ...slice.flatMap((cell, i) =>
            isClass(pick[i]) && !useless.has(keyOf(cell)) ? [{ cell, label: pick[i] }] : [],
          ),
          ...slice.flatMap((cell, i) =>
            pick[i] === MODEL && cell.exception !== null && !useless.has(keyOf(cell))
              ? [{ cell, label: cell.exception }]
              : [],
          ),
        ]),
        ledger: "corrections",
      },
      {
        rows: rows(taken.filter((c) => c.ledger === "reviewed").map((cell) => ({ cell, label: cell.label }))),
        ledger: "reviewed",
      },
    ];
    const wanted = slice.filter((c) => remeasure.has(keyOf(c)));
    if (wanted.length > 0) onDirtyCells(wanted);
    if (junk.length > 0) onUnusable(junk);
    await onFlush(slice[0].pos, writes, priorOf(slice));
    setSkipped((s) => new Set([...s, ...slice.map(keyOf)]));
    setRemeasure((r) => new Set([...r].filter((k) => !slice.some((c) => keyOf(c) === k))));
    setUseless((u) => new Set([...u].filter((k) => !slice.some((c) => keyOf(c) === k))));
    setTrail((t) => [...t, slice.map(keyOf)]);
    clear();
  }, [onDirtyCells, onFlush, onUnusable, pick, priorOf, remeasure, rows, shifted, slice,
      useless, verdictOf]);

  /** Backspace — this page is not answerable here; it leaves without a row. */
  const discard = useCallback(() => {
    setSkipped((s) => new Set([...s, ...slice.map(keyOf)]));
    setTrail((t) => [...t, slice.map(keyOf)]);
    clear();
  }, [slice]);

  /**
   * Die letzte Seite noch einmal ansehen — auch die schon geschriebenen Zellen. Geschriebenes
   * bleibt geschrieben (zurücknehmen tut `z`), aber seit der Pinsel die Seite VOLL schreibt hatte
   * der Knopf sonst nie etwas zurückzuholen und sah tot aus (User, 2026-08-17).
   */
  const back = useCallback(() => {
    const last = trail[trail.length - 1];
    if (last) {
      setTrail((t) => t.slice(0, -1));
      setSkipped((s) => new Set([...s].filter((k) => !last.includes(k))));
      setRevived((r) => new Set([...r, ...last]));
    } else if (safePage > 0) {
      setPage(safePage - 1);
    }
    clear();
  }, [safePage, trail]);

  /** Zweimal dieselbe Farbe nimmt sie wieder ab — der Radierer des Bretts, ohne eigene Taste. */
  const put = (i: number, label: string) => {
    if (label === USELESS) {
      const key = keyOf(slice[i]);
      setUseless((u) => {
        const next = new Set(u);
        if (!next.delete(key)) next.add(key);
        return next;
      });
      return;
    }
    if (label === MATTE) {
      const key = keyOf(slice[i]);
      setRemeasure((r) => {
        const next = new Set(r);
        if (!next.delete(key)) next.add(key);
        return next;
      });
      return;
    }
    // Ohne Modellwort schreibt `accept` fuer diese Marke nichts — sie duerfte der Zelle sonst
    // still ihre Vorbelegung nehmen und sie als beantwortet fuehren.
    if (label === MODEL && !modelPickable(slice[i])) return;
    setPick((p) => {
      const next = { ...p };
      if (next[i] === label) delete next[i];
      else next[i] = label;
      return next;
    });
  };

  /** Die ganze Seite auf das Wort des Modells; ein zweiter Druck räumt sie wieder ab. Nur Zellen,
   *  die eines HABEN — ohne `exception` schriebe die Marke beim Bestätigen nichts (`accept`). */
  const allToModel = useCallback(() => {
    const eligible = slice.flatMap((c, i) => (c.exception !== null ? [i] : []));
    setPick((p) => {
      if (eligible.every((i) => p[i] === MODEL)) {
        const next = { ...p };
        for (const i of eligible) delete next[i];
        return next;
      }
      return { ...p, ...Object.fromEntries(eligible.map((i) => [i, MODEL])) };
    });
  }, [slice]);

  // `put` MUSS ueber den Ref laufen: der Effekt darunter laeuft einmal und hielt sonst die
  // Closure des ERSTEN Renders fest — nach einem Seitenwechsel schrieb `u` dann das Urteil auf
  // eine Zelle von Seite eins, die der Mensch nie gesehen hat.
  const now = useRef({ accept, discard, brush, cursor, slice, put });
  const nowFlood = useRef(allToModel);
  useEffect(() => {
    now.current = { accept, discard, brush, cursor, slice, put };
    nowFlood.current = allToModel;
  });
  useEffect(() => {
    actionsRef.current = {
      commit: () => void now.current.accept(),
      reject: () => now.current.discard(),
      toggleAt: () => now.current.put(now.current.cursor, now.current.brush),
      gridAt: () => now.current.put(now.current.cursor, MODEL),
      floodModel: () => nowFlood.current(),
      brush: (label) => setBrush((b) => (b === label ? UNSURE : label)),
      step: (delta) => setCursor((i) => Math.max(0, Math.min(now.current.slice.length - 1, i + delta))),
      undo: () => false,
    };
  }, [actionsRef]);

  /** Gemeldet ist das FRAME: jede Karte desselben `session|stem` trägt die Marke sofort mit. */
  const dirty = useMemo(() => dirtyOnPage(slice, reported), [reported, slice]);

  // The header counts in the LANE's order, so the position survives a switch to a board lane.
  const head = slice[0];
  const claims = pageClaim(slice);
  useEffect(() => {
    if (head) onAt(cells.indexOf(head));
  }, [cells, head, onAt]);

  if (!head) return <p className="text-muted-foreground text-sm">Diese Lane ist abgearbeitet.</p>;

  if (shifted) {
    return (
      <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-6 text-sm">
        <p className="text-muted-foreground">Die Behauptung wechselt.</p>
        <p className="font-mono text-lg">
          <span className="text-muted-foreground line-through">FEN {seen}</span>
          <span className="mx-3">→</span>
          <span className="bg-background rounded border px-2 py-0.5 font-bold">FEN {claim}</span>
        </p>
        <p className="text-muted-foreground">
          Die nächsten {slice.length} Zellen behaupten etwas anderes als die vorigen. Erst
          weiterklicken, dann urteilen.
        </p>
        <Button autoFocus className={TOUCH} onClick={() => setSeen(claim)} size="sm">
          verstanden — weiter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        {/* Die Behauptung der Seite, GROSS — pro Karte danach suchen war die Beschwerde (2026-08-15). */}
        <span className="bg-background rounded border px-2 py-0.5 font-mono text-lg font-bold">
          FEN {claims.fen.join(" · ") || "—"}
        </span>
        {claims.models.length > 0 ? (
          <span className="bg-background rounded border px-2 py-0.5 font-mono text-lg font-bold text-fuchsia-300">
            Modell {slice.some((c) => c.exception === null) ? [...claims.models, "—"].join(" · ") : claims.models.join(" · ")}
          </span>
        ) : null}
        <strong>Vorbelegung: {claims.preselect}</strong>
        <span className="text-muted-foreground">
          {open.length} Zellen {showDone ? "(mit fertigen)" : "offen"} · Seite {safePage + 1}/{pages} · Klick malt den Pinsel ·
          Rechtsklick = Modell hat recht · Pinsel 🖐 setzt die Hand auf die ZELLE ·
          🖐 in der Crop-Ecke meldet das GANZE Frame
        </span>
        {warned.length > 0 ? (
          <span className="rounded border border-amber-500/60 px-2 py-0.5 text-amber-300">
            ⚠ {warned.join(" · ")} — diese Aufnahme nennt das Feld sonst anders
          </span>
        ) : null}
        <Button className={`ml-auto ${TOUCH}`} onClick={() => void accept()} size="sm">
          ⏎ {counts.taken} bestätigen
          {counts.painted > 0 ? ` · ${counts.painted} gemalt` : ""}
          {counts.model > 0 ? ` · ${counts.model}× Modell` : ""}
          {counts.unsure > 0 ? ` · ${counts.unsure} unsicher` : ""}

        </Button>
        <Button
          className={TOUCH}
          disabled={trail.length === 0 && safePage === 0}
          onClick={back}
          size="sm"
          variant="outline"
        >
          ← zurück
        </Button>
        <Button className={TOUCH} disabled={safePage + 1 >= pages} onClick={() => goPage(1)} size="sm" variant="outline">
          Seite überspringen
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <PaletteRow active={brush} onPick={(label) => setBrush((b) => (b === label ? UNSURE : label))} />
        <button
          className={`w-11 cursor-pointer rounded border py-0.5 text-center font-mono text-xs max-sm:h-11 ${
            brush === MATTE
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          onClick={(event) => {
            event.currentTarget.blur();
            setBrush((b) => (b === MATTE ? UNSURE : MATTE));
          }}
          title="dirty — Hand drauf. Meldet das Frame, zusätzlich zum Label, kein Ersatz."
          type="button"
        >
          {DIRTY_KEY} <span className="text-sm">🖐</span>
        </button>
        <button
          className={`w-11 cursor-pointer rounded border py-0.5 text-center font-mono text-xs max-sm:h-11 ${
            brush === USELESS
              ? "border-destructive bg-destructive text-white"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          onClick={(event) => {
            event.currentTarget.blur();
            setBrush((b) => (b === USELESS ? UNSURE : USELESS));
          }}
          title="unbrauchbar — aus diesem Crop ist kein Label zu holen. Eigenes Ledger, keine Klasse."
          type="button"
        >
          {UNUSABLE_KEY} <span className="text-sm">🚫</span>
        </button>
        <Button
          className={TOUCH}
          onClick={(event) => {
            event.currentTarget.blur();
            setPeek((v) => !v);
          }}
          size="sm"
          variant={peek ? "default" : "outline"}
        >
          🔍 Brett
        </Button>
        <Button
          className={TOUCH}
          disabled={slice.every((c) => c.exception === null)}
          onClick={(event) => {
            event.currentTarget.blur();
            allToModel();
          }}
          size="sm"
          variant="outline"
        >
          A alle: Modell
        </Button>
        <span className="text-muted-foreground ml-auto text-xs">
          Pinsel{" "}
          <span className="text-foreground font-mono">
            {brush === UNSURE
              ? "keiner — Klick = unsicher"
              : brush === MATTE
                ? `dirty — Hand drauf (${remeasure.size} Zellen markiert)`
                : brush === USELESS
                  ? `unbrauchbar (${useless.size} Zellen markiert)`
                  : brush}
          </span>
        </span>
      </div>

      {peek && hover !== null && slice[hover] ? (
        <BoardPeek
          caption={`${slice[hover].square} · ${sessions[slice[hover].session].name} · ${slice[hover].stem}`}
          matte={matteOverlay(
            coverage[slice[hover].session]?.[slice[hover].stem],
            `/api/matte/${sessions[slice[hover].session].name}/${slice[hover].stem}?size=384`,
          )}
          square={slice[hover].square}
          src={`/api/board/${sessions[slice[hover].session].name}/${slice[hover].stem}?size=512`}
        />
      ) : null}

      <CropGrid
        cells={slice.map((cell, i) => ({
          key: keyOf(cell),
          src: `/api/cell/${sessions[cell.session].name}/${cell.stem}/${cell.square}?size=${CROP}`,
          alt: `${cell.square} @ ${cell.stem}`,
          caption: cell.caption,
          ...(cellCoverage(coverage, cell) ? { covered: cellCoverage(coverage, cell)! } : {}),
          ...handMark(handBeside(frameHands, coverage, cell), cell.square),
          ...(handsUnmeasured(handScanned, cell) ? { handsUnmeasured: true } : {}),
          ...noteOf(cell, useless.has(keyOf(cell)) ? "🚫 unbrauchbar" : verdictOf(cell)),
          ...(dirty.has(i) || remeasure.has(keyOf(cell)) ? { dirty: true } : {}),
          ...(isClass(pick[i]) ? { paint: pick[i] } : {}),
        }))}
        cursor={cursor}
        erasing={(i, mode) =>
          brush === MATTE && mode !== "right"
            ? remeasure.has(keyOf(slice[i]))
            : brush === USELESS && mode !== "right"
              ? useless.has(keyOf(slice[i]))
              : pick[i] === (mode === "right" ? MODEL : brush)
        }
        marked={new Set(slice.flatMap((_, i) => (pick[i] === MODEL ? [i] : [])))}
        onDirty={(i) => onDirty(slice[i], !dirty.has(i))}
        onContextPick={(i) => {
          setCursor(i);
          put(i, MODEL);
        }}
        onPick={(i) => {
          setCursor(i);
          put(i, brush);
        }}
        onHover={peek ? setHover : undefined}
        paintable
        onSweep={(i, mode, erase) => {
          setCursor(i);
          const label = mode === "right" ? MODEL : brush;
          setPick((p) => {
            const next = { ...p };
            if (erase) delete next[i];
            else next[i] = label;
            return next;
          });
        }}
        wrong={new Set(slice.flatMap((_, i) => (pick[i] === UNSURE ? [i] : [])))}
      />
    </div>
  );
}
