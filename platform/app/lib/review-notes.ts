/** UI-only ledger: verdicts on unusable boards and bad intervals (not training input). */
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { appendRows, writeFileAtomic } from "@/lib/atomic";
import { serialize } from "@/lib/serialize";
import { checkName, dataDir } from "@/lib/data";
import { readJsonl } from "@/lib/jsonl";

/**
 * Is SAM's alpha right, is the interval's FEN what the board shows. "I cannot read this square" is
 * NOT one of them: that square sits under a hand and the loss drops it by itself. `dirty-frame` is
 * the hand the scan missed — `plan_scanned` moves that frame to the dirty pile as `occluded`.
 */
const FRAME_VERDICTS =
  ["unusable-board", "matte-ok", "matte-bad", "matte-clean", "position-ok", "dirty-frame",
   "matte-wanted"] as const;
export type FrameVerdict = (typeof FRAME_VERDICTS)[number];

export type ReviewNote =
  | { session_id: string; frame: string; verdict: FrameVerdict; reason?: string }
  | { session_id: string; ply: number; verdict: "bad-interval"; reason?: string };


export type ReviewNoteRow = ReviewNote & { ts: string };

export function reviewNotesPath(): string {
  return path.join(dataDir(), "labels", "review-notes.jsonl");
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
    // `Number(null)` ist 0, `Number(true)` ist 1, `Number("")` ist 0: ein Koerper ohne `ply`
    // landete sonst als Urteil ueber Halbzug 0. `app/api/zuege/[name]/note` prueft das seit je,
    // `app/api/review-notes` kommt ueber DIESE Tuer und tat es nicht.
    const given = typeof r.ply === "number" || (typeof r.ply === "string" && r.ply.trim() !== "");
    const ply = given ? Number(r.ply) : Number.NaN;
    if (!Number.isInteger(ply) || ply < 0) throw new Error(`bad ply: ${String(r.ply)}`);
    return { session_id: String(r.session_id), ply, verdict: "bad-interval", ...reason };
  }
  throw new Error(`bad verdict: ${r.verdict}`);
}

export async function appendReviewNotes(rows: ReviewNote[]): Promise<number> {
  if (rows.length === 0) return 0;
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
  const file = reviewNotesPath();
  // Unter demselben Riegel wie der Widerruf: der liest die GANZE Datei und schreibt sie neu,
  // ein Anhaengen dazwischen waere danach weg.
  return serialize(file, async () => {
    await mkdir(path.dirname(file), { recursive: true });
    await appendRows(file, rows.map((r) => ({ ...r, ts })));
    cache.delete(file);
    return rows.length;
  });
}

/**
 * Eine Meldung wieder wegnehmen. Anhängen kann das nicht: `realgames.reported_dirty` sammelt jede
 * `dirty-frame`-Zeile ein und kennt keinen Widerruf, also muss die Zeile verschwinden.
 */

export async function dropReviewNotes(rows: ReviewNote[]): Promise<number> {
  if (rows.length === 0) return 0;
  // Lesen-aendern-schreiben auf der GLOBALEN Datei: zwei gleichzeitige Widerrufe lasen denselben
  // Text, der zweite holte die Zeile des ersten zurueck, und beide meldeten Erfolg. Der Aufrufer
  // erzeugt genau das (`stream.tsx::markPaintedDirty` feuert je Frame ohne `await`).
  return serialize(reviewNotesPath(), () => dropUnlocked(rows));
}

async function dropUnlocked(rows: ReviewNote[]): Promise<number> {
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
  // tmp+rename: ein blankes `writeFile` kuerzt zuerst, und dies ist die einzige Datei, die die
  // Urteile ALLER Sitzungen traegt.
  await writeFileAtomic(file, kept.length > 0 ? kept.join("\n") + "\n" : "");
  cache.delete(file);
  // Die ENTFERNTEN, nicht der Rest: ein Widerruf, der nichts trifft, meldete sonst die Groesse
  // des globalen Ledgers als Erfolg.
  return text.split("\n").filter((line) => line.trim()).length - kept.length;
}

const noteKey = (r: ReviewNote): string =>
  `${r.session_id}|${"frame" in r ? r.frame : r.ply}|${r.verdict}`;

/** Per frame, the last word on each question — `undefined` means nobody was asked yet. */
export type FrameReview = {
  matte?: "ok" | "bad" | "clean"; position?: "ok"; dirty?: true;
  /** Der Mensch hat dieses strittige Frame zur Matte geschickt — `alpha-worker --wanted` holt es. */
  wanted?: true;
  /** When the matte verdict was given — a merge that rewrote the mask later reopens the frame. */
  matteAt?: string;
};

/** `matte-clean` heisst: SAM hat eine Hand gefunden, wo keine ist — das Alpha wird geleert. */
const MATTE: Record<string, "ok" | "bad" | "clean"> = {
  "matte-ok": "ok",
  "matte-bad": "bad",
  "matte-clean": "clean",
};
type BySession = Map<string, { boards: Set<string>; plies: Set<number>; frames: Map<string, FrameReview> }>;
type Cache = Map<string, { key: string; value: BySession }>;
const cache: Cache = ((globalThis as { __chesslabReviewNotes?: Cache }).__chesslabReviewNotes ??= new Map());

async function bySession(): Promise<BySession> {
  const file = reviewNotesPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  const value: BySession = new Map();
  // Nur ein FEHLENDES Ledger ist "noch keine Urteile", wie `lib/corrections.ts` es haelt. Jeder
  // andere Lesefehler als "" durchgereicht loescht jedes menschliche Urteil aller Sitzungen —
  // und der Cache haelt die Luege, bis sich die mtime bewegt.
  const text = await readFile(file, "utf8").catch((e) => {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
    return "";
  });
  // Eine kaputte Zeile MITTENDRIN zu ueberspringen verliert ein Urteil lautlos: das Frame, das ein
  // Mensch weggeworfen hat, steht danach wieder in der Lane. Der Schwanz eines laufenden
  // Anhaengens ist dagegen erwartbar und kostet nichts.
  const read = readJsonl(text);
  if (read.corrupt > 0) throw new Error(`${file}: ${read.corrupt} beschaedigte Zeile(n)`);
  for (const line of read.rows) {
    const row = line as unknown as ReviewNoteRow;
    const entry = value.get(row.session_id)
      ?? { boards: new Set<string>(), plies: new Set<number>(), frames: new Map<string, FrameReview>() };
    if (row.verdict === "bad-interval") entry.plies.add(row.ply);
    else if (row.verdict === "unusable-board") entry.boards.add(row.frame);
    else {
      const seen = entry.frames.get(row.frame) ?? {};
      if (row.verdict === "position-ok") entry.frames.set(row.frame, { ...seen, position: "ok" });
      else if (row.verdict === "dirty-frame") entry.frames.set(row.frame, { ...seen, dirty: true });
      else if (row.verdict === "matte-wanted") entry.frames.set(row.frame, { ...seen, wanted: true });
      else entry.frames.set(row.frame, { ...seen, matte: MATTE[row.verdict], matteAt: row.ts });
    }
    value.set(row.session_id, entry);
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

/** Stems, die ein Mensch aus der Frame-Lane zur Matte geschickt hat. */
export async function matteWanted(session_id: string): Promise<Set<string>> {
  const frames = (await bySession()).get(session_id)?.frames ?? new Map<string, FrameReview>();
  return new Set([...frames].flatMap(([stem, r]) => (r.wanted ? [stem] : [])));
}

/** Plies whose interval the human called junk — the picture, not the move. */
export async function badIntervals(session_id: string): Promise<Set<number>> {
  return new Set((await bySession()).get(session_id)?.plies ?? []);
}
