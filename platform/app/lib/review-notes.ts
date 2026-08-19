/** UI-only ledger: verdicts on unusable boards and bad intervals (not training input). */
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir } from "@/lib/data";

/**
 * Is SAM's alpha right, is the interval's FEN what the board shows. "I cannot read this square" is
 * NOT one of them: that square sits under a hand and the loss drops it by itself. `dirty-frame` is
 * the hand the scan missed — `plan_scanned` moves that frame to the dirty pile as `occluded`.
 */
export const FRAME_VERDICTS = ["unusable-board", "matte-ok", "matte-bad", "position-ok", "dirty-frame"] as const;
export type FrameVerdict = (typeof FRAME_VERDICTS)[number];

export type ReviewNote =
  | { session_id: string; frame: string; verdict: FrameVerdict; reason?: string }
  | { session_id: string; ply: number; verdict: "bad-interval"; reason?: string };

export type ReviewNoteRow = ReviewNote & { ts: string };

export function reviewNotesPath(): string {
  return path.join(dataDir(), "manifests", "review-notes.jsonl");
}

export function validateNote(row: unknown): ReviewNote {
  const r = row as { session_id?: unknown; frame?: unknown; ply?: unknown; verdict?: unknown; reason?: unknown };
  if (!r || typeof r !== "object") throw new Error("row is not an object");
  checkName(String(r.session_id), "session_id");
  const reason = r.reason === undefined ? {} : { reason: String(r.reason) };
  if (FRAME_VERDICTS.includes(r.verdict as FrameVerdict)) {
    checkName(String(r.frame), "frame");
    return { session_id: String(r.session_id), frame: String(r.frame), verdict: r.verdict as FrameVerdict, ...reason };
  }
  if (r.verdict === "bad-interval") {
    const ply = Number(r.ply);
    if (!Number.isInteger(ply) || ply < 0) throw new Error(`bad ply: ${r.ply}`);
    return { session_id: String(r.session_id), ply, verdict: "bad-interval", ...reason };
  }
  throw new Error(`bad verdict: ${r.verdict}`);
}

export async function appendReviewNotes(rows: ReviewNote[]): Promise<number> {
  if (rows.length === 0) return 0;
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
  const file = reviewNotesPath();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, rows.map((r) => JSON.stringify({ ...r, ts })).join("\n") + "\n", "utf8");
  cache.delete(file);
  return rows.length;
}

/**
 * Eine Meldung wieder wegnehmen. Anhängen kann das nicht: `realgames.reported_dirty` sammelt jede
 * `dirty-frame`-Zeile ein und kennt keinen Widerruf, also muss die Zeile verschwinden.
 */
export async function dropReviewNotes(rows: ReviewNote[]): Promise<number> {
  if (rows.length === 0) return 0;
  const file = reviewNotesPath();
  const text = await readFile(file, "utf8").catch(() => "");
  if (!text) return 0;
  const drop = new Set(rows.map(noteKey));
  const kept = text.split("\n").filter((line) => {
    if (!line.trim()) return false;
    try {
      return !drop.has(noteKey(JSON.parse(line) as ReviewNote));
    } catch {
      return true;
    }
  });
  await writeFile(file, kept.length > 0 ? kept.join("\n") + "\n" : "", "utf8");
  cache.delete(file);
  return kept.length;
}

const noteKey = (r: ReviewNote): string =>
  `${r.session_id}|${"frame" in r ? r.frame : r.ply}|${r.verdict}`;

/** Per frame, the last word on each question — `undefined` means nobody was asked yet. */
export type FrameReview = { matte?: "ok" | "bad"; position?: "ok"; dirty?: true };
type BySession = Map<string, { boards: Set<string>; plies: Set<number>; frames: Map<string, FrameReview> }>;
type Cache = Map<string, { key: string; value: BySession }>;
const cache: Cache = ((globalThis as { __chesslabReviewNotes?: Cache }).__chesslabReviewNotes ??= new Map());

async function bySession(): Promise<BySession> {
  const file = reviewNotesPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  const value: BySession = new Map();
  const text = await readFile(file, "utf8").catch(() => "");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as ReviewNoteRow;
      const entry = value.get(row.session_id)
        ?? { boards: new Set<string>(), plies: new Set<number>(), frames: new Map<string, FrameReview>() };
      if (row.verdict === "bad-interval") entry.plies.add(row.ply);
      else if (row.verdict === "unusable-board") entry.boards.add(row.frame);
      else {
        const seen = entry.frames.get(row.frame) ?? {};
        if (row.verdict === "position-ok") entry.frames.set(row.frame, { ...seen, position: "ok" });
        else if (row.verdict === "dirty-frame") entry.frames.set(row.frame, { ...seen, dirty: true });
        else entry.frames.set(row.frame, { ...seen, matte: row.verdict === "matte-ok" ? "ok" : "bad" });
      }
      value.set(row.session_id, entry);
    } catch {
      /* a half-written line is not a verdict */
    }
  }
  cache.set(file, { key, value });
  return value;
}

/** Frames the human threw out of this session — "never show it again", reload-proof. */
export async function unusableBoards(session_id: string): Promise<Set<string>> {
  return new Set((await bySession()).get(session_id)?.boards ?? []);
}

/** What the human already answered per frame — the matte review's own progress. */
export async function frameReviews(session_id: string): Promise<Map<string, FrameReview>> {
  return new Map((await bySession()).get(session_id)?.frames ?? []);
}

/** Plies whose interval the human called junk — the picture, not the move. */
export async function badIntervals(session_id: string): Promise<Set<number>> {
  return new Set((await bySession()).get(session_id)?.plies ?? []);
}
