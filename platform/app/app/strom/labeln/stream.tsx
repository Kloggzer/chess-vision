"use client";

import { usePathname, useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Why } from "@/app/page-title";
import { Notice } from "@/components/notice";
import { Progress } from "@/components/progress";
import { SEGMENTS, segment } from "@/components/segmented";
import { STREAM_PALETTE } from "@/components/board-paint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Correction, Ledger } from "@/lib/corrections";
import { coveragePct, coveredSquares } from "@/lib/classes";
import { DIRTY_BRUSH, DIRTY_KEY, dirtyRows, frameKey } from "@/lib/dirty-frames";
import type { LabelStream, StreamBoard } from "@/lib/label-stream";
import {
  DEFAULT_LANE,
  LANES,
  type LaneId,
  boardCells,
  laneAccept,
  laneBoards,
  laneBySlug,
  laneCells,
  laneChip,
  laneCount,
  laneById,
  laneEmpty,
  laneOpen,
  lanePath,
  laneReads,
  laneFrames,
  openFrames,
  keepPosition,
  UNUSABLE_BRUSH,
  UNUSABLE_KEY,
  recentCells,
  openBoards,
  openCells,
  wallCells,
  type LaneCell,
} from "@/lib/lanes";
import { queryText, type Filter, type QueryAnswer } from "@/lib/query";
import { cursorSession, linkFilter } from "@/lib/stream-head";
import { addRows, emptyTally } from "@/lib/session-tally";
import { BoardLane } from "./board-lane";
import { FrameLane, type FrameVerdict } from "./frame-lane";
import { CellLane } from "./cell-lane";
import { MobileSort } from "./mobile-sort";
import { WallQueryBar } from "./wall-query";

/**
 * LABELN — every board of every session, one continuous feed (CONCEPT.md §4.2).
 *
 * The lane bar is a FILTER over one ordered stream, never a page: every item carries the same
 * ordinal, so switching a lane is a search in that order and keeps you where you were. The
 * renderer is the lane's own (board vs. cell grid, REVIEW S10), and so is its denominator.
 */
export type Verdict = { rows: Correction[]; ledger: Ledger };
/** One flush, with the rows that put it back — `z` after the flush needs both (§4.2.2). */
type Batch = { pos: number; revert: Verdict[] };
/** `prior` holds what each cell fell back FROM, keyed `session_id|frame|square`. */
export type Flush = (
  pos: number,
  writes: Verdict[],
  prior: Record<string, string | undefined>,
) => Promise<boolean>;

/** Everything the one key handler can ask of the active renderer. */
export type LaneActions = {
  commit?: () => void;
  reject?: () => void;
  flagsOff?: () => void;
  toggleAt?: () => void;
  gridAt?: () => void;
  /** Die ganze Seite auf das Wort des Modells — die Zell-Lanes fragen nichts anderes. */
  floodModel?: () => void;
  step?: (delta: number) => void;
  nextPly?: () => void;
  brush?: (label: string) => void;
  undo?: () => boolean;
};

/** `null` = a tombstone took the cell back out of the judged map. */
type Written = Record<number, Record<string, string | null>>;

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

const KEYS: [string, string][] = [
  ["⏎", "commit → nächstes"],
  ["⌫", "Flags aus → nächstes"],
  ["f", "Flags aus, hier bleiben"],
  ["⎵", "Flag unter dem Zeiger"],
  ["⇧⎵", "Modell hat recht (Zell-Lanes)"],
  ["← →", "Brett blättern"],
  ["⇧⏎", "nächster Halbzug"],
  ["z", "zurück"],
  ["d", "Hand drauf → ganzes Frame dirty"],
  ["u", "Pinsel: Crop unbrauchbar (Zell-Lanes)"],
  ["x", "Brett raus"],
  ["X", "Aufnahme raus"],
  [".", "/game (neuer Tab)"],
];

/**
 * What is known about a hand on THIS frame: SAM's measurement, and the human's own report.
 *
 * Both lanes need it — a cell lane shows one square at a time and never the hand beside it, which
 * is how a covered crop reaches the eye with nothing saying so (User, 2026-08-19).
 */
function OcclusionChip({ coverage, reported }: { coverage?: Record<string, number>; reported: boolean }) {
  const over = coverage === undefined ? [] : coveredSquares(coverage);
  const [tone, text, why] =
    coverage === undefined
      ? ["text-muted-foreground", "Alpha —", "kein SAM-Alpha für dieses Frame (`occluders alpha-worker`)"]
      : over.length === 0
        ? ["text-muted-foreground", "frei", "SAM hat gemessen: kein Feld über PIECE_VISIBLE_MAX"]
        : ["text-amber-500", `${over.length} verdeckt`,
           `über PIECE_VISIBLE_MAX: ${over.map((sq) => `${sq} ${coveragePct(coverage[sq]) ?? "<1 %"}`).join(" · ")}`];
  return (
    <span className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`font-mono text-xs ${tone}`}>{text}</span>
        </TooltipTrigger>
        <TooltipContent>{why}</TooltipContent>
      </Tooltip>
      {reported ? <span className="font-mono text-xs text-amber-500">· dirty gemeldet</span> : null}
    </span>
  );
}

export function LabelnStream({ stream, wall }: { stream: LabelStream; wall: QueryAnswer }) {
  const router = useRouter();
  const lane = laneBySlug(usePathname().split("/").pop() ?? "")?.id ?? DEFAULT_LANE.id;
  const [answer, setAnswer] = useState(wall);
  const [asking, setAsking] = useState(false);
  const [at, setAt] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const [written, setWritten] = useState<Written>({});
  const [thrown, setThrown] = useState<ReadonlySet<string>>(new Set<string>());
  const [dropped, setDropped] = useState<ReadonlySet<number>>(new Set<number>());
  /**
   * Gemeldete Frames. Der Zettel liegt in `review-notes.jsonl`, also muss die Marke einen Reload
   * überleben — sonst meldet man dasselbe Frame in der nächsten Sitzung ein zweites Mal.
   */
  const [reported, setReported] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        stream.sessions.flatMap((s, index) => s.reportedDirty.map((stem) => `${index}|${stem}`)),
      ),
  );
  const [tally, setTally] = useState(emptyTally);
  /** Was `z` zurücknehmen kann, mit dem Zeitpunkt — die jüngste Tat gewinnt gegen den Flush. */
  const [dirtyTrail, setDirtyTrail] = useState<{ session: number; stem: string; at: number }[]>([]);
  const [history, setHistory] = useState<Batch[]>([]);
  const [note, setNote] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const say = useCallback((text: string) => setNote({ tone: "info", text }), []);
  const fail = useCallback((error: unknown) => setNote({ tone: "error", text: String(error) }), []);
  const [gaps, setGaps] = useState<number[]>([]);
  const [phone, setPhone] = useState(false);
  const actions = useRef<LaneActions>({});
  const decidedAt = useRef<number | null>(null);

  // The phone gets one crop and four buckets (§4.3); the board is a desktop instrument.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const read = () => setPhone(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  /**
   * `Klassenwand` is a server-side question (`lib/corpus-query.ts`), and the URL is its answer's
   * address: the lane is "a place" (CONCEPT.md 4.2), so a chosen query has to survive a bookmark.
   * `replaceState` and not the router — a navigation here would re-render the lane under the answer.
   */
  const ask = useCallback(async (next: Filter, nextPhase: string) => {
    const search = `class=${encodeURIComponent(next.klass)}&min=${next.min}&phase=${nextPhase}`;
    setAsking(true);
    try {
      const res = await fetch(`/api/query?${search}`);
      const body = (await res.json()) as QueryAnswer & { error?: string };
      if (!res.ok) throw new Error(body.error);
      setAnswer(body);
      setAt(0);
      window.history.replaceState(null, "", `${window.location.pathname}?${search}`);
    } catch (error) {
      fail(error);
    } finally {
      setAsking(false);
    }
  }, [fail]);

  // A shared link carries a query the server's default answer is not. Scheduled, not called: the
  // fetch is the external system this effect talks to, and the render must not wait on it.
  // Ein fehlendes `min` ist nicht die Schwelle 0: die laesst jede Zelle mit `probs` durch, der
  // Client schrieb sie auch noch in die URL zurueck, und die Huerde in `app/api/query/route.ts`
  // hatte danach nichts mehr zu halten.
  useEffect(() => {
    const link = linkFilter(window.location.search);
    if (!link) return;
    const same =
      link.filter.klass === wall.filter.klass &&
      link.filter.min === wall.filter.min &&
      link.phase === wall.phase;
    if (same) return;
    const timer = setTimeout(() => void ask(link.filter, link.phase), 0);
    return () => clearTimeout(timer);
  }, [ask, wall]);

  const wallLane = useMemo(
    () => ({ cells: wallCells(answer.hits, stream), text: queryText(answer.filter) }),
    [answer, stream],
  );

  const decided = useMemo(
    () =>
      stream.decided.map((base, i) => {
        const overlay = written[i];
        if (!overlay) return base;
        const out = { ...base };
        for (const [key, label] of Object.entries(overlay)) {
          if (label === null) delete out[key];
          else out[key] = label;
        }
        return out;
      }),
    [stream.decided, written],
  );

  const live = useCallback(
    (b: StreamBoard) => !dropped.has(b.session) && !thrown.has(`${b.session}|${b.stem}`),
    [dropped, thrown],
  );
  // Jede Lane laesst sich auf FERTIG stellen: was bestaetigt ist, verschwand sonst fuer immer aus
  // dem Strom, und ein Fehler, der einem erst danach auffaellt, war nicht mehr erreichbar.
  const withDone = showDone;
  const boards = useMemo(
    () => (withDone ? laneBoards(stream, lane) : openBoards(stream, lane)).filter(live),
    [live, lane, stream, withDone],
  );
  const cells = useMemo(() => {
    const own =
      laneById(lane).renderer === "cells"
        ? withDone
          ? laneCells(stream, lane, wallLane)
          : openCells(stream, lane, wallLane)
        : boardCells(boards, lane);
    // Das zuletzt Beurteilte VORAN: wem der Fehler erst nach dem ⏎ auffaellt, der sucht ihn nicht
    // durch die Lane, sondern findet ihn auf Seite 1.
    const seenKey = new Set(own.map((c) => `${c.session}|${c.stem}|${c.square}`));
    const raw = withDone
      ? [...recentCells(stream).filter((c) => !seenKey.has(`${c.session}|${c.stem}|${c.square}`)), ...own]
      : own;
    return raw.filter((c) => !dropped.has(c.session) && !thrown.has(`${c.session}|${c.stem}`));
  }, [boards, dropped, lane, stream, thrown, wallLane, withDone]);

  const renderer = laneById(lane).renderer;
  const frames = useMemo(
    () => (withDone ? laneFrames(stream, lane) : openFrames(stream, lane)).filter(live),
    [lane, live, stream, withDone],
  );
  const board = renderer === "board" ? boards[Math.min(at, boards.length - 1)] : undefined;
  const positions = useMemo(
    () =>
      renderer === "board" ? boards.map((b) => b.pos)
      : renderer === "frames" ? frames.map((f) => f.pos)
      : cells.map((c) => c.pos),
    [boards, cells, frames, renderer],
  );
  const pos = positions[Math.min(at, positions.length - 1)] ?? 0;
  const length = renderer === "board" ? boards.length : renderer === "frames" ? frames.length : cells.length;

  function switchLane(id: LaneId) {
    const next =
      laneById(id).renderer === "board"
        ? openBoards(stream, id).filter(live).map((b) => b.pos)
        : laneById(id).renderer === "frames"
          ? openFrames(stream, id).filter(live).map((f) => f.pos)
          : openCells(stream, id, wallLane).map((c) => c.pos);
    setAt(keepPosition(next, pos));
    router.push(lanePath(id));
  }

  /** Median seconds between decisions, in memory and reset by a reload — §6.1 allows no other. */
  function ticked() {
    const stamp = Date.now();
    const previous = decidedAt.current;
    if (previous !== null) setGaps((g) => [...g, stamp - previous]);
    decidedAt.current = stamp;
  }

  const indexOf = useMemo(
    () => new Map(stream.sessions.map((s, i) => [s.sessionId, i])),
    [stream.sessions],
  );
  const overlay = useCallback(
    (rows: Correction[], label: (r: Correction) => string | null) => {
      setWritten((w) => {
        const next = { ...w };
        for (const r of rows) {
          const i = indexOf.get(r.session_id);
          if (i === undefined) continue;
          next[i] = { ...next[i], [`${r.frame}|${r.square}`]: label(r) };
        }
        return next;
      });
    },
    [indexOf],
  );

  /**
   * The tombstone carries the value the cell falls back to, so the row is a correct last-wins
   * label for `load_corrections` and a delete for `decidedKeys` (§4.2.2). It goes into the ledger
   * the row came FROM: a reviewed row left judged keeps the board closed, which is the half
   * REVIEW S4 says a superseding row cannot fix.
   */
  const flush = useCallback<Flush>(
    async (pos_, writes, prior) => {
      const real = writes.filter((w) => w.rows.length > 0);
      if (real.length === 0) return true;
      try {
        for (const { rows, ledger } of real) {
          await post("/api/corrections", { rows, ledger });
          setTally((t) => addRows(t, rows, ledger));
          overlay(rows, (r) => r.label);
        }
        const revert = real.map(({ rows, ledger }) => ({
          ledger,
          rows: rows.map((r) => ({
            ...r,
            label: prior[`${r.session_id}|${r.frame}|${r.square}`] ?? r.label,
            retract: true as const,
          })),
        }));
        setHistory((h) => [...h, { pos: pos_, revert }]);
        ticked();
        return true;
      } catch (error) {
        // Der Anrufer muss den Fehlschlag SEHEN: nur angezeigt, liess er die Lane weiterblaettern,
        // und die Seite galt als geschrieben, obwohl keine Zeile auf der Platte steht.
        fail(error);
        return false;
      }
    },
    [fail, overlay],
  );

  /** `z` once the rows have left: the tombstone, and the board it reopens. */
  const undoFlushed = useCallback(async () => {
    const batch = history[history.length - 1];
    if (!batch) return;
    setHistory((h) => h.slice(0, -1));
    try {
      for (const { rows, ledger } of batch.revert) {
        await post("/api/corrections", { rows, ledger });
        overlay(rows, () => null);
      }
      setAt(keepPosition(positions, batch.pos));
      say(`zurückgenommen — ${batch.revert.reduce((n, v) => n + v.rows.length, 0)} Zellen wieder offen`);
    } catch (error) {
      fail(error);
    }
  }, [fail, history, overlay, positions, say]);

  /** The frame under the cursor, whichever renderer is up — a cell lane throws ITS board out too. */
  const here = board ?? (renderer === "frames" ? frames[Math.min(at, frames.length - 1)] : undefined)
    ?? cells[Math.min(at, cells.length - 1)];
  /** `{square: coverage}` of the frame under the cursor; `undefined` while no alpha was ever cut. */
  const coverage = here ? stream.coverage[here.session]?.[here.stem] : undefined;
  const dirtyHere = here !== undefined && reported.has(frameKey(here));

  /** `x` — the picture is junk. A verdict, never a label, so training input cannot be corrupted. */
  async function throwBoard() {
    if (!here) return;
    const session = stream.sessions[here.session];
    const key = `${here.session}|${here.stem}`;
    setThrown((t) => new Set(t).add(key));
    say(`${here.stem} raus — kein Label geschrieben, bleibt raus (review-notes.jsonl)`);
    try {
      await post("/api/review-notes", {
        rows: [{ session_id: session.sessionId, frame: here.stem, verdict: "unusable-board", reason: "Labeln-Strom: x" }],
      });
    } catch (error) {
      // Ohne Zettel bleibt das Brett in der Lane: sonst ist es bis zum Neuladen weg, und auf der
      // Platte steht nichts — dieselbe Ruecknahme wie in `ruleFrame`.
      setThrown((t) => new Set([...t].filter((k) => k !== key)));
      fail(error);
    }
  }

  /** Eine Hand, die der Scan verpasst hat — auf dem GANZEN Frame, nicht auf dem einen Feld. Kein
   *  Label und kein Rauswurf: das FEN bleibt, der nächste Export legt alle 64 Felder auf den Stapel. */
  const markDirty = useCallback(
    async (index: number, stem: string, on: boolean, reason: string) => {
      const key = `${index}|${stem}`;
      const flip = (set: ReadonlySet<string>, add: boolean) => {
        const next = new Set(set);
        if (add) next.add(key);
        else next.delete(key);
        return next;
      };
      // Erst die Marke, dann der POST: der Crop muss beim Klick umspringen, nicht nach der Antwort.
      setReported((r) => flip(r, on));
      setDirtyTrail((t) => (on ? [...t, { session: index, stem, at: Date.now() }] : t.filter((d) => `${d.session}|${d.stem}` !== key)));
      say(
        on
          ? `${stem}: ganzes Frame als dirty gemeldet — FEN bleibt, alle 64 Felder gehen auf den Stapel`
          : `${stem}: dirty-Meldung zurückgenommen — das Frame zählt wieder als sauber`,
      );
      try {
        const rows = dirtyRows(stream.sessions[index].sessionId, stem, reason);
        const answer = await post<{ adoptFailed?: string[] }>("/api/review-notes", on ? { rows } : { rows, retract: true });
        // Der Zettel liegt, `adopt-dirty` sprang aber nicht an — die Marke stimmt, der Stapel nicht.
        for (const why of answer.adoptFailed ?? []) fail(why);
      } catch (error) {
        setReported((r) => flip(r, !on));
        fail(`dirty-Meldung fehlgeschlagen, Marke zurückgesetzt: ${String(error)}`);
      }
    },
    [fail, say, stream.sessions],
  );

  /** Der Dirty-Pinsel: gemalte Zellen melden ihr FRAME — derselbe Weg wie die Crop-Ecke. */
  const markPaintedDirty = useCallback(
    (cells: LaneCell[]) => {
      const frames = new Map<string, LaneCell>();
      for (const c of cells) frames.set(`${c.session}|${c.stem}`, c);
      for (const c of frames.values()) {
        void markDirty(c.session, c.stem, true, "Labeln-Strom: Dirty-Pinsel");
      }
    },
    [markDirty],
  );

  /** `z` nimmt die JÜNGSTE Tat zurück — ein Zettel zählt nur, solange nach ihm nichts geschrieben wurde. */
  function undoDirty(): boolean {
    const last = dirtyTrail[dirtyTrail.length - 1];
    if (!last || last.at < (decidedAt.current ?? 0)) return false;
    void markDirty(last.session, last.stem, false, "Labeln-Strom: z");
    return true;
  }

  /** `X` — the whole recording. The rows it already wrote stay: the ledger is append-only. */
  async function throwSession() {
    const index = here?.session;
    if (index === undefined) return;
    const session = stream.sessions[index];
    setDropped((d) => new Set(d).add(index));
    say(`${session.name} ist nutzlos — Corrections bleiben (append-only, /corpus zählt sie als Pool ohne Snapshot)`);
    try {
      await post(`/api/useless/${session.name}`, { useless: true, reason: "Labeln-Strom: X" });
    } catch (error) {
      // Eine GANZE Aufnahme lautlos aus der Lane zu nehmen, ohne dass `useless.json` steht, ist
      // der teuerste Fall dieser Sorte.
      setDropped((d) => new Set([...d].filter((i) => i !== index)));
      fail(error);
    }
  }

  /**
   * Das Urteil ueber ein ganzes Frame. `matte` legt einen Zettel, `unusable` setzt das Flag im
   * `log.jsonl` — beide nehmen das Frame hier aus der Lane, das Nachladen holt die Wahrheit.
   */
  async function ruleFrame(frame: StreamBoard, verdict: FrameVerdict) {
    const session = stream.sessions[frame.session];
    setThrown((t) => new Set(t).add(`${frame.session}|${frame.stem}`));
    say(
      verdict === "matte"
        ? `${frame.stem} zur Matte — SAM holt es mit \`occluders alpha-worker --wanted\`, danach liegen seine Crops in Strittig`
        : `${frame.stem} unbrauchbar — Flag im log.jsonl, Slice und Matte ueberspringen die Zeile`,
    );
    try {
      await post("/api/frame-verdict", { session_id: session.sessionId, frame: frame.stem, verdict });
    } catch (error) {
      setThrown((t) => new Set([...t].filter((k) => k !== `${frame.session}|${frame.stem}`)));
      fail(error);
    }
  }

  /** „Aus diesem Crop ist kein Label zu holen" — ein eigenes Ledger, nie `corrections.jsonl`. */
  const ruleCells = useCallback(
    async (marked: LaneCell[]) => {
      if (marked.length === 0) return;
      const rows = marked.map((c) => ({
        session_id: stream.sessions[c.session].sessionId,
        frame: c.stem,
        square: c.square,
        unusable: true,
      }));
      try {
        await post("/api/unusable-cells", { rows });
        say(`${rows.length} Crops als unbrauchbar vermerkt — sie werden zu keiner Manifest-Zeile`);
      } catch (error) {
        fail(error);
      }
    },
    [fail, say, stream.sessions],
  );

  // One listener, one keymap — the renderers publish what they can do instead of binding keys of
  // their own, which is how `bucket.tsx` and `drilldown.tsx` came to disagree about Space.
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
    const now = actions.current;
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        return event.shiftKey ? now.nextPly?.() : now.commit?.();
      case "Backspace":
        event.preventDefault();
        return now.reject?.();
      case "f":
        event.preventDefault();
        return now.flagsOff?.();
      case " ":
        event.preventDefault();
        return event.shiftKey ? now.gridAt?.() : now.toggleAt?.();
      case "A":
        event.preventDefault();
        return now.floodModel?.();
      case "ArrowLeft":
        event.preventDefault();
        return now.step?.(-1);
      case "ArrowRight":
        event.preventDefault();
        return now.step?.(1);
      case "z":
        event.preventDefault();
        if (now.undo?.() || undoDirty()) return;
        void undoFlushed();
        return;
      case "d":
        event.preventDefault();
        if (here) void markDirty(here.session, here.stem, !dirtyHere, "Labeln-Strom: d");
        return;
      case "x":
        event.preventDefault();
        return void throwBoard();
      case "X":
        event.preventDefault();
        return void throwSession();
      case ".": {
        event.preventDefault();
        if (here) window.open(`/game/${stream.sessions[here.session].name}`, "_blank", "noopener");
        return;
      }
      default: {
        if (event.key === UNUSABLE_KEY) {
          event.preventDefault();
          now.brush?.(UNUSABLE_BRUSH);
          return;
        }
        if (event.key === DIRTY_KEY) {
          event.preventDefault();
          now.brush?.(DIRTY_BRUSH);
          return;
        }
        const hit = STREAM_PALETTE.find(([k]) => k === event.key);
        if (!hit) return;
        event.preventDefault();
        now.brush?.(hit[1]);
      }
    }
  };
  // No dependency array: the listener above reads THIS render's closure through the ref.
  useEffect(() => {
    handler.current = onKey;
  });

  // `?? 0` nannte im Kopf die ERSTE Aufnahme, sobald nichts unter dem Zeiger lag — eine Aufnahme,
  // die mit der leeren Lane nichts zu tun hat.
  const session = cursorSession(stream.sessions, here);
  const counts = useMemo(() => LANES.map((l) => laneCount(stream, l.id, wallLane)), [stream, wallLane]);
  const seconds = median(gaps);
  const open = renderer === "board"
    ? boards.filter((b) => laneOpen(b, lane, decided[b.session] ?? {})).length
    : renderer === "frames"
      ? openFrames(stream, lane).filter(live).length
      : cells.filter((c) => (decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined).length;
  const pct = stream.progress.boards > 0 ? (stream.progress.done / stream.progress.boards) * 100 : 0;
  // A new query is a new corpus, not a new page of the old one — the renderer starts over.
  const laneKey = lane === "audit" ? `${lane}|${wallLane.text}|${answer.phase}` : lane;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <nav className={SEGMENTS}>
        {LANES.map((l, i) => {
          const chip = laneChip(l, counts[i]);
          const on = lane === l.id;
          // The reason sits on the WRAPPER: a disabled button carries no tooltip, and a `—` chip
          // whose reason cannot be read is the "0" it exists to avoid.
          return (
            <Tooltip key={l.id}>
              <TooltipTrigger asChild>
                <span>
                  <button
                    className={`${segment(on, counts[i].n !== null && counts[i].n !== 0, i === 0)} h-full disabled:cursor-default disabled:opacity-40`}
                    disabled={counts[i].n === null}
                    // Blurred: the stream listens on `window`, and a focused button eats the Enter.
                    onClick={(event) => {
                      event.currentTarget.blur();
                      switchLane(l.id);
                    }}
                    type="button"
                  >
                    {l.label}
                    <span className={`ml-1.5 tabular-nums ${on ? "opacity-70" : "text-muted-foreground"}`}>
                      {counts[i].n === null ? "—" : counts[i].n}
                    </span>
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{chip.title}</TooltipContent>
            </Tooltip>
          );
        })}
        </nav>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="text-muted-foreground ml-1 flex cursor-pointer items-center gap-1 text-xs max-sm:h-11">
              <input checked={showDone} onChange={(e) => setShowDone(e.target.checked)} type="checkbox" />
              Fertige zeigen
            </label>
          </TooltipTrigger>
          <TooltipContent>
            Zeigt auch die schon bestaetigten Zellen, mit ihrem Urteil auf der Karte. Malen schreibt
            eine neue Zeile, die die alte ueberholt; wer nichts anfasst, schreibt nichts.
          </TooltipContent>
        </Tooltip>
      </div>

      {lane === "audit" && stream.auditStaleSince ? (
        <Notice tone="warn">
          Veraltet seit {new Date(stream.auditStaleSince).toLocaleString("de-DE")}: es gibt neuere Matten oder
          Modell-Lesarten. Neu bauen mit <code>chesslab realgames audit-flags --occupancy --visible</code>.
        </Notice>
      ) : null}

      {lane === "audit" ? (
        <WallQueryBar
          busy={asking}
          cells={answer.cells}
          classes={answer.classes}
          filter={answer.filter}
          ms={answer.ms}
          onAsk={(next, nextPhase) => void ask(next, nextPhase)}
          phase={answer.phase}
        />
      ) : null}

      <header className="border-border flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <span className="text-foreground text-sm font-medium tabular-nums">
          {Math.min(at + 1, length)}/{length}{" "}
          <span className="text-muted-foreground text-xs font-normal">{laneById(lane).unit}</span>
        </span>
        <Why>
          Jedes Brett jeder Session, ein Strom. Die Lanes oben filtern ihn (Position bleibt
          erhalten). Flags markieren, was der Commit schreibt; ⏎ bestätigt und geht weiter. Die
          Tasten stehen rechts.
        </Why>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Progress
                bar="w-20"
                done={stream.progress.done}
                total={stream.progress.boards}
                unit="Bretter"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>{`Bretter mit Vorschlägen, korpusweit · ${pct.toFixed(1)} %`}</TooltipContent>
        </Tooltip>
        {session ? (
          <span className="text-muted-foreground truncate font-mono">
            {session.sessionId}
            {board ? ` · ${board.stem} · ply ${board.ply}` : ""}
          </span>
        ) : null}
        {here ? (
          <>
            <OcclusionChip coverage={coverage} reported={dirtyHere} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-xs max-sm:h-11 ${
                    dirtyHere ? "border-amber-500 bg-amber-500 text-black" : "border-border hover:bg-accent/50"
                  }`}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    void markDirty(here.session, here.stem, !dirtyHere, "Labeln-Strom: Kopf");
                  }}
                  type="button"
                >
                  {dirtyHere ? "🖐 dirty — zurücknehmen" : "🖐 Frame dirty"}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {`Meldet das GANZE Frame ${here.stem} — alle 64 Felder, nicht das einzelne Feld. Die Stellung bleibt, der nächste Export legt es auf den dirty-Stapel (Taste d).`}
              </TooltipContent>
            </Tooltip>
          </>
        ) : null}
        {board && board.violations.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-amber-500">{board.violations.join(" · ")}</span>
            </TooltipTrigger>
            <TooltipContent>
              Entweder die markierte Korrektur oder das FEN ist falsch — welche von beiden, sagt die
              Regel nicht. Klick zykelt Korrektur ⇄ FEN-Wort; x wirft das Brett raus.
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground ml-auto tabular-nums">
              {seconds === null ? "— s" : `${(seconds / 1000).toFixed(1)} s`} · Rest ≈{" "}
              {seconds === null ? "—" : hours((seconds / 1000) * open)}
            </span>
          </TooltipTrigger>
          <TooltipContent>Median der Sekunden zwischen zwei Urteilen, seit dem Laden</TooltipContent>
        </Tooltip>
      </header>

      {note ? note.tone === "error" ? <Notice tone="error">{note.text}</Notice> : <p className="text-muted-foreground text-sm">{note.text}</p> : null}

      <div className="gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_212px]">
        <div>
          {length === 0 ? (
            <p className="text-muted-foreground text-sm">{laneEmpty(lane)}</p>
          ) : renderer === "frames" ? (
            <FrameLane
              actionsRef={actions}
              at={at}
              frames={frames}
              key={lane}
              onAt={setAt}
              onVerdict={(frame, verdict) => void ruleFrame(frame, verdict)}
              sessions={stream.sessions}
            />
          ) : phone ? (
            <MobileSort
              actionsRef={actions}
              cells={cells}
              decided={decided}
              showDone={showDone}
              key={laneKey}
              onFlush={flush}
              onThrow={() => void throwBoard()}
              onUndo={() => void undoFlushed()}
              sessions={stream.sessions}
              tally={tally}
            />
          ) : board ? (
            <BoardLane
              accept={laneAccept(board, lane)}
              actionsRef={actions}
              board={board}
              coverage={coverage}
              decided={decided[board.session] ?? {}}
              name={stream.sessions[board.session].name}
              onFlush={flush}
              onNext={(ply) => setAt(nextOpen(boards, at, lane, decided, ply))}
              onStep={(delta) => setAt((i) => Math.max(0, Math.min(boards.length - 1, i + delta)))}
              reads={laneReads(board, lane)}
              sessionId={stream.sessions[board.session].sessionId}
            />
          ) : (
            <CellLane
              actionsRef={actions}
              at={at}
              cells={cells}
              coverage={stream.coverage}
              decided={decided}
              frameHands={stream.frameHands}
              handScanned={stream.handScanned}
              key={laneKey}
              onAt={setAt}
              onDirty={(cell, on) => void markDirty(cell.session, cell.stem, on, "Labeln-Strom: Crop-Ecke")}
              onFlush={flush}
              onDirtyCells={markPaintedDirty}
              onUnusable={(marked) => void ruleCells(marked)}
              reported={reported}
              showDone={showDone}
              sessions={stream.sessions}
            />
          )}
        </div>

        <aside className="mt-4 space-y-2 lg:mt-0">
          <Panel open={open} tally={tally} unit={laneById(lane).unit} />
          <details className="border-border rounded-lg border px-3 py-2">
            <summary className="text-muted-foreground cursor-pointer text-xs font-medium max-sm:h-11">
              Tasten ({KEYS.length})
            </summary>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {KEYS.map(([k, what]) => (
                <Fragment key={k}>
                  <dt>
                    <kbd className="text-foreground font-mono">{k}</kbd>
                  </dt>
                  <dd className="text-muted-foreground">{what}</dd>
                </Fragment>
              ))}
            </dl>
          </details>
        </aside>
      </div>

    </section>
  );
}

/** The next board still worth stopping at; `ply` set means the next one of a DIFFERENT half-move. */
function nextOpen(
  boards: readonly StreamBoard[],
  from: number,
  lane: LaneId,
  decided: Record<string, string>[],
  ply?: number,
): number {
  for (let i = from + 1; i < boards.length; i++) {
    const b = boards[i];
    if (ply !== undefined && b.ply === ply) continue;
    if (laneOpen(b, lane, decided[b.session] ?? {})) return i;
  }
  return Math.min(from + 1, boards.length - 1);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const hours = (s: number) => (s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

/** §6.1 — what THIS sitting did, in memory, reset by a reload. */
function Panel({
  tally,
  open,
  unit,
}: {
  tally: ReturnType<typeof emptyTally>;
  open: number;
  unit: string;
}) {
  const items: [string, number, string][] = [
    ["Bretter fertig", tally.boards.size, "distinkte Frames, die seit dem Laden in ein Ledger geschrieben haben"],
    ["Zellen bestätigt", tally.cellsConfirmed, "Zeilen in reviewed.jsonl — der FEN stimmte"],
    ["Figuren korrigiert", tally.piecesCorrected, "Zeilen mit einem Label außer occluded und empty"],
  ];
  return (
    <div className="border-border bg-muted/30 rounded-lg border px-3 py-2 text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-muted-foreground mb-1 font-medium">Diese Sitzung</p>
        </TooltipTrigger>
        <TooltipContent>in memory, ein Reload setzt sie zurück</TooltipContent>
      </Tooltip>
      <dl className="space-y-0.5">
        {items.map(([label, value, why]) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground truncate">{label}</dt>
                <dd className="text-foreground font-medium tabular-nums">{value}</dd>
              </div>
            </TooltipTrigger>
            <TooltipContent>{why}</TooltipContent>
          </Tooltip>
        ))}
        <div className="border-border mt-1 flex items-baseline justify-between gap-2 border-t pt-1">
          <dt className="text-muted-foreground truncate">offen in dieser Lane</dt>
          <dd className="text-foreground font-medium tabular-nums">
            {open} {unit}
          </dd>
        </div>
      </dl>
    </div>
  );
}
