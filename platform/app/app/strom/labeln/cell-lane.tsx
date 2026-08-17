"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { CROP, CropGrid, PAGE } from "@/components/crop-grid";
import { PaletteRow } from "@/components/palette-row";
import type { Correction } from "@/lib/corrections";
import type { StreamSession } from "@/lib/label-stream";
import type { LaneCell } from "@/lib/lanes";
import type { Flush, LaneActions, Verdict } from "./stream";

export type CellLaneProps = {
  cells: LaneCell[];
  sessions: StreamSession[];
  decided: Record<string, string>[];
  at: number;
  onAt: (at: number) => void;
  actionsRef: RefObject<LaneActions>;
  onFlush: Flush;
};

const TOUCH = "max-sm:h-11 max-sm:px-3";
const keyOf = (c: LaneCell) => `${c.session}|${c.stem}|${c.square}`;

/**
 * Die zwei Marken, die keine Klasse sind. OHNE Pinsel heißt der Klick weiter „unsicher" — er
 * schreibt nichts, und die Zelle kommt wieder; `MODEL` schreibt das Wort des Modells.
 */
const UNSURE = "";
const MODEL = "modell";
const isClass = (v: string | undefined): v is string => v !== undefined && v !== UNSURE && v !== MODEL;

/** What one cell of the page carries before it is written: a class, or one of the two non-classes. */
type Picks = Record<number, string>;

/**
 * A cell lane, rendered as the bucket grid the buckets already were (REVIEW S10). A page is one
 * keypress, grouped BY SQUARE — a handful of squares at a few moments each, not six scattered
 * crops of the same one. The palette loads a BRUSH like the board's: a click paints the armed
 * class, and one Enter writes the page.
 */
export function CellLane({ cells, sessions, decided, at, onAt, actionsRef, onFlush }: CellLaneProps) {
  const [brush, setBrush] = useState<string>(UNSURE);
  const [pick, setPick] = useState<Picks>({});
  /** Ein Batch pro Enter/Backspace — „zurück" holt seine UNBESCHRIEBENEN Zellen an ihre Position. */
  const [trail, setTrail] = useState<string[][]>([]);
  const [cursor, setCursor] = useState(0);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set<string>());
  /** Von „zurück" wieder hergeholt: die Zelle steht im Ledger und wird trotzdem noch mal gezeigt. */
  const [revived, setRevived] = useState<ReadonlySet<string>>(new Set<string>());
  const [page, setPage] = useState(() => Math.floor(at / PAGE));

  const open = useMemo(
    () =>
      cells.filter((c) => {
        const key = keyOf(c);
        if (skipped.has(key)) return false;
        return revived.has(key) || (decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined;
      }),
    [cells, decided, revived, skipped],
  );
  const pages = Math.max(1, Math.ceil(open.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = useMemo(() => open.slice(safePage * PAGE, safePage * PAGE + PAGE), [open, safePage]);

  // Die nächste Seite wird vorgewärmt, während geurteilt wird: die Crops entstehen serverseitig,
  // und der Umblätter-Moment war die spürbare Wartezeit (User, 2026-08-15). 1-h-Cache trägt sie.
  useEffect(() => {
    const next = open.slice((safePage + 1) * PAGE, (safePage + 2) * PAGE);
    for (const c of next) {
      const img = new window.Image();
      img.src = `/api/cell/${sessions[c.session].name}/${c.stem}/${c.square}?size=${CROP}`;
    }
  }, [open, safePage, sessions]);

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

  const counts = useMemo(() => {
    const values = slice.map((_, i) => pick[i]);
    return {
      painted: values.filter(isClass).length,
      model: values.filter((v) => v === MODEL).length,
      unsure: values.filter((v) => v === UNSURE).length,
      taken: values.filter((v) => v === undefined).length,
    };
  }, [pick, slice]);

  /**
   * Enter writes the page: what the brush painted, the exceptions the model won, and for every
   * untouched cell the lane's own default. Unsicher schreibt NICHTS — ohne Ledger-Zeile kommt die
   * Zelle bei der nächsten Sitzung wieder, genau die versprochene spätere Aufbereitung.
   */
  const accept = useCallback(async () => {
    if (slice.length === 0) return;
    const taken = slice.filter((_, i) => pick[i] === undefined);
    const writes: Verdict[] = [
      {
        rows: rows([
          ...taken.filter((c) => c.ledger === "corrections").map((cell) => ({ cell, label: cell.label })),
          ...slice.flatMap((cell, i) => (isClass(pick[i]) ? [{ cell, label: pick[i] }] : [])),
          ...slice.flatMap((cell, i) =>
            pick[i] === MODEL && cell.exception !== null ? [{ cell, label: cell.exception }] : [],
          ),
        ]),
        ledger: "corrections",
      },
      {
        rows: rows(taken.filter((c) => c.ledger === "reviewed").map((cell) => ({ cell, label: cell.label }))),
        ledger: "reviewed",
      },
    ];
    await onFlush(slice[0].pos, writes, priorOf(slice));
    setSkipped((s) => new Set([...s, ...slice.map(keyOf)]));
    setTrail((t) => [...t, slice.map(keyOf)]);
    clear();
  }, [onFlush, pick, priorOf, rows, slice]);

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
  const put = (i: number, label: string) =>
    setPick((p) => {
      const next = { ...p };
      if (next[i] === label) delete next[i];
      else next[i] = label;
      return next;
    });

  const now = useRef({ accept, discard, brush, cursor, slice });
  useEffect(() => {
    now.current = { accept, discard, brush, cursor, slice };
  });
  useEffect(() => {
    actionsRef.current = {
      commit: () => void now.current.accept(),
      reject: () => now.current.discard(),
      toggleAt: () => put(now.current.cursor, now.current.brush),
      gridAt: () => put(now.current.cursor, MODEL),
      brush: (label) => setBrush((b) => (b === label ? UNSURE : label)),
      step: (delta) => setCursor((i) => Math.max(0, Math.min(now.current.slice.length - 1, i + delta))),
      undo: () => false,
    };
  }, [actionsRef]);

  // The header counts in the LANE's order, so the position survives a switch to a board lane.
  const head = slice[0];
  useEffect(() => {
    if (head) onAt(cells.indexOf(head));
  }, [cells, head, onAt]);

  if (!head) return <p className="text-muted-foreground text-sm">Diese Lane ist abgearbeitet.</p>;

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        {/* Die Behauptung der Seite, GROSS — pro Karte danach suchen war die Beschwerde (2026-08-15). */}
        <span className="bg-background rounded border px-2 py-0.5 font-mono text-lg font-bold">
          FEN {[...new Set(slice.map((c) => c.fen_label))].join(" · ") || "—"}
        </span>
        {head.exception !== null ? (
          <span className="bg-background rounded border px-2 py-0.5 font-mono text-lg font-bold text-fuchsia-300">
            Modell {[...new Set(slice.map((c) => c.exception ?? "—"))].join(" · ")}
          </span>
        ) : null}
        <strong>{head.ledger === "reviewed" ? "Vorbelegung: FEN stimmt" : `Vorbelegung: ${head.label}`}</strong>
        <span className="text-muted-foreground">
          {open.length} Zellen offen · Seite {safePage + 1}/{pages} · Klick malt den Pinsel ·
          Rechtsklick = Modell hat recht
        </span>
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
        <Button className={TOUCH} disabled={safePage + 1 >= pages} onClick={() => setPage(safePage + 1)} size="sm" variant="outline">
          Seite überspringen
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <PaletteRow active={brush} onPick={(label) => setBrush((b) => (b === label ? UNSURE : label))} />
        <span className="text-muted-foreground ml-auto text-xs">
          Pinsel{" "}
          <span className="text-foreground font-mono">{brush === UNSURE ? "keiner — Klick = unsicher" : brush}</span>
        </span>
      </div>

      <CropGrid
        cells={slice.map((cell, i) => ({
          key: keyOf(cell),
          src: `/api/cell/${sessions[cell.session].name}/${cell.stem}/${cell.square}?size=${CROP}`,
          alt: `${cell.square} @ ${cell.stem}`,
          caption: cell.caption,
          note: cell.note,
          ...(isClass(pick[i]) ? { paint: pick[i] } : {}),
        }))}
        cursor={cursor}
        erasing={(i, mode) => pick[i] === (mode === "right" ? MODEL : brush)}
        marked={new Set(slice.flatMap((_, i) => (pick[i] === MODEL ? [i] : [])))}
        onContextPick={(i) => {
          setCursor(i);
          put(i, MODEL);
        }}
        onPick={(i) => {
          setCursor(i);
          put(i, brush);
        }}
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
