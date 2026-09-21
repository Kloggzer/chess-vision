/**
 * `data/recordings/<name>/corrections.jsonl` — the shared schema of specs/53 entry.md and the
 * ONLY bridge to the Python side. Append-only is correct: `labeling.load_corrections` dedups on
 * `(session_id, frame, square)` with LAST LINE WINNING, so an undo is a superseding row.
 *
 * The rows stay GLOBAL training input (CLAUDE.md) — only the file moved next to the recording it
 * judges, which is why the writer validates instead of trusting the client.
 */
import { readFile, stat } from "node:fs/promises";
import { appendRows } from "@/lib/atomic";
import path from "node:path";
import { isIdentity } from "@/lib/classes";
import { checkName, gameDir, requireRecording } from "@/lib/data";
import { recordingName, sessionId } from "@/lib/session";
import { jsonlRowsStrict } from "@/lib/jsonl";

/** Tombstone: deletes from `decidedKeys` so the board reopens; Python reads the label fallback (4.2.2). */
export type Correction = {
  session_id: string;
  frame: string;
  square: string;
  label: string;
  retract?: boolean;
};
type CorrectionRow = Correction & { ts: string };

const SQUARE = /^[a-h][1-8]$/;

/** `corrections` = GLOBAL TRAINING INPUT; `reviewed` = provenance only (Python skips it), written
 *  per recording by three UI paths — the file exists again since 2026-08-20. */
export type Ledger = "corrections" | "reviewed";

/** Per RECORDING since 2026-08-20 — `name` is the directory, never the `rg-` prefixed id. */
function ledgerPath(name: string, ledger: Ledger = "corrections"): string {
  return path.join(gameDir(name), `${ledger}.jsonl`);
}

export function correctionsPath(name: string): string {
  return ledgerPath(name, "corrections");
}

export function validate(row: unknown): Correction {
  const r = row as Partial<Correction>;
  if (!r || typeof r !== "object") throw new Error("row is not an object");
  checkName(String(r.session_id), "session_id");
  checkName(String(r.frame), "frame");
  if (!SQUARE.test(String(r.square))) throw new Error(`bad square: ${r.square}`);
  // Reads keep the legacy rows; a WRITE may only say one of the 13. Occlusion comes from
  // `matte.jsonl` now, and a hand-painted 14th class would contradict a measured `coverage`.
  if (!isIdentity(String(r.label))) throw new Error(`bad label: ${r.label}`);
  return {
    session_id: r.session_id as string,
    frame: r.frame as string,
    square: r.square as string,
    label: r.label as string,
    // Only the literal `true` survives: an absent key must not become `"retract": false` noise in
    // a file every later slice reads.
    ...(r.retract === true ? { retract: true as const } : {}),
  };
}

/** Append and flush — no buffering across requests (spec 03, "Writes"). */
export async function appendCorrections(rows: Correction[], ledger: Ledger = "corrections"): Promise<number> {
  if (rows.length === 0) return 0;
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
  // One request may carry rows of several recordings, and each ledger sits in its own directory.
  const bySession = new Map<string, Correction[]>();
  for (const row of rows) bySession.set(row.session_id, [...(bySession.get(row.session_id) ?? []), row]);
  for (const [session_id, mine] of bySession) {
    const file = ledgerPath(recordingName(session_id), ledger);
    // `recursive` legte die AUFNAHME selbst an: ein Tippfehler in `session_id` erzeugte ein
    // Verzeichnis, das `listGames` danach in jeder Lane fuehrt — mit Trainingseingabe darin.
    await requireRecording(path.dirname(file), session_id);
    await appendRows(file, mine.map((r) => ({ ...r, ts })));
    // Our own write is the one case an mtime key can miss (same millisecond, and on a coarse clock
    // the same stamp), so the entry goes rather than being trusted to look stale.
    ledgers.delete(file);
  }
  return rows.length;
}

/** Was auf einer Zelle steht, mit dem Zeitpunkt — ohne ihn ist „zuletzt beurteilt" nicht zu ordnen. */
export type Standing = { label: string; ts: string };
/** One session's verdicts, keyed `frame|square` — the whole ledger, split by session once. */
type BySession = Map<string, Map<string, Standing>>;

/**
 * Eine geschriebene Zeile MIT dem Wert, der vor ihr stand. Die Historie liest daraus ihr „alt →
 * neu"; aus der Last-wins-Karte allein ist das nicht zu holen, die hat den Vorgänger weggeworfen.
 */
export type LedgerChange = {
  session_id: string;
  frame: string;
  square: string;
  label: string;
  before: string | null;
  retract: boolean;
  ledger: Ledger;
  ts: string;
  /** Zeilennummer im Ledger — gleiche `ts` trägt ein ganzer Stapel, die Reihenfolge steht nur hier. */
  seq: number;
};

type Parsed = { bySession: BySession; changes: LedgerChange[] };
type LedgerCache = Map<string, { key: string; value: Parsed }>;
/**
 * Pinned on `globalThis` like `lib/jobs.ts`'s `queue`, mtime-keyed like `loadModelReads`. `/`
 * asked for this file once per game and split all of it every time — 36 full parses of a growing
 * ledger for one page (REVIEW.md S12). Der Name traegt die FORM des Werts: der Cache ueberlebt einen Hot-Reload, also las die neue
 * Funktion sonst die alten Zeilen als halb leere Objekte.
 */
const ledgers: LedgerCache = ((globalThis as { __chesslabLedgersV2?: LedgerCache }).__chesslabLedgersV2 ??= new Map());

async function ledgerRows(name: string, ledger: Ledger): Promise<Parsed> {
  const file = ledgerPath(name, ledger);
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = ledgers.get(file);
  if (hit?.key === key) return hit.value;

  const bySession: BySession = new Map();
  const changes: LedgerChange[] = [];
  let seq = 0;
  // Nur ein fehlendes Ledger ist "noch keine Urteile". Jeder andere Lesefehler waere sonst als
  // leere Datei durchgereicht, und die Lane zeigt geloeschte Urteile als "nie gefaellt".
  const text = await readFile(file, "utf8").catch((e) => {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
    return "";
  });
  for (const line of jsonlRowsStrict(file, text)) {
    const row = line as unknown as CorrectionRow;
    const session = bySession.get(row.session_id) ?? new Map<string, Standing>();
    const cell = `${row.frame}|${row.square}`;
    changes.push({
      session_id: row.session_id,
      frame: row.frame,
      square: row.square,
      label: row.label,
      before: session.get(cell)?.label ?? null,
      retract: row.retract === true,
      ledger,
      ts: row.ts ?? "",
      seq: seq++,
    });
    // The tombstone of CONCEPT.md 4.2.2: the cell leaves the judged map, so the board reopens.
    // Python still sees a normal last-wins row and takes `label`.
    if (row.retract === true) session.delete(cell);
    else session.set(cell, { label: row.label, ts: row.ts ?? "" });
    bySession.set(row.session_id, session);
  }
  ledgers.set(file, { key, value: { bySession, changes } });
  return { bySession, changes };
}

/** Jede Zeile dieser Aufnahme in Dateireihenfolge — die Historie ordnet selbst. */
export async function ledgerChanges(name: string, ledger: Ledger): Promise<LedgerChange[]> {
  const id = sessionId(name);
  return (await ledgerRows(name, ledger)).changes.filter((c) => c.session_id === id);
}

/** `frame|square` of every square this session already has a verdict for — the progress bar. */
export async function decidedKeys(name: string, ledger: Ledger = "corrections"): Promise<Map<string, string>> {
  // A copy: the cached map outlives the request, and a caller that merges into it would edit the
  // ledger for every later reader.
  const mine = (await ledgerRows(name, ledger)).bySession.get(sessionId(name)) ?? new Map();
  return new Map([...mine].map(([key, v]) => [key, v.label]));
}

export type Recent = { frame: string; square: string; label: string; ledger: Ledger; ts: string };

/**
 * Die zuletzt beurteilten Zellen dieser Aufnahme, jüngste zuerst — der Rückweg zu dem, was man
 * eben bestätigt hat. Beide Ledger in EINER Liste, denn wer nachkorrigiert, weiß nicht, welches
 * die Zeile geschrieben hat; bei gleichem Schlüssel gewinnt die spätere Zeile.
 */
export async function recentVerdicts(name: string, limit: number): Promise<Recent[]> {
  const id = sessionId(name);
  const out = new Map<string, Recent>();
  for (const ledger of ["reviewed", "corrections"] as const) {
    for (const [key, v] of (await ledgerRows(name, ledger)).bySession.get(id) ?? []) {
      // Die Korrektur gewinnt IMMER, wie in `judgedKeys` — sie laeuft als zweites Ledger. Der
      // Zeitvergleich liess eine neuere `reviewed`-Zeile gewinnen, und die Lane zeigte dann ein
      // Label, das Python nie benutzt.
      const [frame, square] = key.split("|");
      out.set(key, { frame, square, label: v.label, ledger, ts: v.ts });
    }
  }
  return [...out.values()].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, limit);
}

/**
 * Every cell this session has a HUMAN verdict for, from both ledgers — what the views must not
 * ask again. Corrections win a collision: a cell that was later relabeled is not "as the FEN says"
 * any more, whatever an older review row claimed.
 */
export async function judgedKeys(name: string): Promise<Map<string, string>> {
  const [reviewed, corrected] = await Promise.all([
    decidedKeys(name, "reviewed"),
    decidedKeys(name, "corrections"),
  ]);
  return new Map([...reviewed, ...corrected]);
}
