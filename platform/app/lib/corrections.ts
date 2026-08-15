/**
 * `data/manifests/corrections.jsonl` — the shared schema of specs/53 entry.md and the ONLY
 * bridge to the Python side. Append-only is correct: `labeling.load_corrections` dedups on
 * `(session_id, frame, square)` with LAST LINE WINNING, so an undo is a superseding row.
 *
 * The file is a GLOBAL training input (CLAUDE.md) — every row written here changes every later
 * slice, which is why the writer validates instead of trusting the client.
 */
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir } from "@/lib/data";

/** `config.CLASSES`, all 14. Free-form on write per the schema, checked here anyway. */
export const CLASSES = [
  "empty",
  "wP", "wN", "wB", "wR", "wQ", "wK",
  "bP", "bN", "bB", "bR", "bQ", "bK",
  "occluded",
] as const;

/** Tombstone: deletes from `decidedKeys` so the board reopens; Python reads the label fallback (4.2.2). */
export type Correction = {
  session_id: string;
  frame: string;
  square: string;
  label: string;
  retract?: boolean;
};
export type CorrectionRow = Correction & { ts: string };

const SQUARE = /^[a-h][1-8]$/;

/** `corrections` = GLOBAL TRAINING INPUT; `reviewed` = provenance only (Python skips it). Solves 2026-08-09 cache reload issue. */
export type Ledger = "corrections" | "reviewed";

export function ledgerPath(ledger: Ledger = "corrections"): string {
  return path.join(dataDir(), "manifests", `${ledger}.jsonl`);
}

export function correctionsPath(): string {
  return ledgerPath("corrections");
}

export function validate(row: unknown): Correction {
  const r = row as Partial<Correction>;
  if (!r || typeof r !== "object") throw new Error("row is not an object");
  checkName(String(r.session_id), "session_id");
  checkName(String(r.frame), "frame");
  if (!SQUARE.test(String(r.square))) throw new Error(`bad square: ${r.square}`);
  if (!CLASSES.includes(String(r.label) as (typeof CLASSES)[number]))
    throw new Error(`bad label: ${r.label}`);
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
  const file = ledgerPath(ledger);
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, rows.map((r) => JSON.stringify({ ...r, ts })).join("\n") + "\n", "utf8");
  // Our own write is the one case an mtime key can miss (same millisecond, and on a coarse clock
  // the same stamp), so the entry goes rather than being trusted to look stale.
  ledgers.delete(file);
  return rows.length;
}

/** One session's verdicts, keyed `frame|square` — the whole ledger, split by session once. */
type BySession = Map<string, Map<string, string>>;
type LedgerCache = Map<string, { key: string; value: BySession }>;
/**
 * Pinned like `lib/jobs.ts:56`, mtime-keyed like `loadProposals`.
 *
 * `/` asked for this file once per game and split all of it every time — 36 full parses of a
 * monotonically growing ledger for one page (REVIEW.md S12). The parse is the same; only how often
 * it runs changed.
 */
const ledgers: LedgerCache = ((globalThis as { __chesslabLedgers?: LedgerCache }).__chesslabLedgers ??= new Map());

async function ledgerRows(ledger: Ledger): Promise<BySession> {
  const file = ledgerPath(ledger);
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = ledgers.get(file);
  if (hit?.key === key) return hit.value;

  const bySession: BySession = new Map();
  const text = await readFile(file, "utf8").catch(() => "");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as CorrectionRow;
      const session = bySession.get(row.session_id) ?? new Map<string, string>();
      // The tombstone of CONCEPT.md 4.2.2: the cell leaves the judged map, so the board reopens.
      // Python still sees a normal last-wins row and takes `label`.
      if (row.retract === true) session.delete(`${row.frame}|${row.square}`);
      else session.set(`${row.frame}|${row.square}`, row.label);
      bySession.set(row.session_id, session);
    } catch {
      /* a half-written line is not a verdict */
    }
  }
  ledgers.set(file, { key, value: bySession });
  return bySession;
}

/** `frame|square` of every square this session already has a verdict for — the progress bar. */
export async function decidedKeys(session_id: string, ledger: Ledger = "corrections"): Promise<Map<string, string>> {
  // A copy: the cached map outlives the request, and a caller that merges into it would edit the
  // ledger for every later reader.
  return new Map((await ledgerRows(ledger)).get(session_id) ?? []);
}

/**
 * Every cell this session has a HUMAN verdict for, from both ledgers — what the views must not
 * ask again. Corrections win a collision: a cell that was later relabeled is not "as the FEN says"
 * any more, whatever an older review row claimed.
 */
export async function judgedKeys(session_id: string): Promise<Map<string, string>> {
  const [reviewed, corrected] = await Promise.all([
    decidedKeys(session_id, "reviewed"),
    decidedKeys(session_id, "corrections"),
  ]);
  return new Map([...reviewed, ...corrected]);
}
