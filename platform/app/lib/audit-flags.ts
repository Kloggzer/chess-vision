/**
 * `data/reports/audit-flags.jsonl` — the landing surface for the two-halves label audit
 * (CONCEPT.md 4.2, TODO "Datensatz-Qualität per Zwei-Hälften-Kreuztest").
 *
 * READ ONLY. The audit is its own project and writes this file; the stream renders the pair of
 * labels a row carries, ranked by `margin`. Its absence is a `—` chip, never an empty lane
 * pretending to be finished.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isIdentity } from "@/lib/classes";
import { dataDir } from "@/lib/data";

export type AuditFlag = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  // TODO: `audit_flags` legt `judged` dazu, damit die Karte das Wort des Menschen statt der FEN
  // nennt; hier faellt der Schluessel weg und die Lane behauptet weiter die FEN.
  /** What the out-of-fold model read there, and how sure it was — printed beside the FEN's word. */
  predicted: string;
  prob: number;
  margin: number;
};

export type AuditFlags = {
  rows: AuditFlag[];
  /** `false` = the producer has not run; the lane renders `—` and says so. */
  present: boolean;
  /**
   * Set when a matte or a model read is NEWER than the flags — the lane then shows work the
   * producer would no longer flag. On 2026-08-26 that was a five-day-old file whose coverage
   * filter had run before the mattes existed: 4 878 flags, mostly hands, against 728 after a
   * rebuild. Silence about it cost an entire review pass.
   */
  staleSince?: string;
};

function auditFlagsPath(): string {
  return path.join(dataDir(), "reports", "audit-flags.jsonl");
}

/** The newest producer timestamp the summary saw. Older than a matte on disk = the flags are stale. */
async function newestInput(): Promise<number> {
  const dir = path.join(dataDir(), "recordings");
  const names = await readdir(dir).catch(() => [] as string[]);
  const stamps = await Promise.all(
    names.flatMap((n) =>
      ["matte.jsonl", "model-reads.jsonl"].map((f) =>
        stat(path.join(dir, n, f)).then((s) => s.mtimeMs, () => 0),
      ),
    ),
  );
  return stamps.length ? Math.max(...stamps) : 0;
}

type Cache = Map<string, { key: string; value: AuditFlags }>;
/** Pinned like `lib/jobs.ts:56` — a module-level Map re-parses on every hot reload. */
const cache: Cache = ((globalThis as { __chesslabAuditFlags?: Cache }).__chesslabAuditFlags ??= new Map());

const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);

/** Margin-descending, which is the order the lane works in — the surest disagreements first. */
export async function loadAuditFlags(): Promise<AuditFlags> {
  const file = auditFlagsPath();
  const own = await stat(file).then((s) => s, () => null);
  const newest = await newestInput();
  const key = own ? `${own.mtimeMs}:${own.size}:${newest}` : `none:${newest}`;
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;
  const staleSince =
    own && newest > own.mtimeMs ? new Date(newest).toISOString() : undefined;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    const missing: AuditFlags = { rows: [], present: false };
    cache.set(file, { key, value: missing });
    return missing;
  }

  const rows: AuditFlag[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      if (typeof o.session_id !== "string" || typeof o.square !== "string") continue;
      // 11 088 of 36 891 rows read `occluded`, which the 14-class audit models still emit. That
      // claim is measured now (`matte.jsonl` -> coverage) and unwritable, so agreeing with it
      // would 400 the whole page — the lane keeps the identity pairs it can act on.
      if (!isIdentity(String(o.predicted ?? ""))) continue;
      rows.push({
        session_id: o.session_id,
        frame: String(o.frame),
        square: o.square,
        fen_label: String(o.fen_label ?? ""),
        predicted: String(o.predicted ?? ""),
        prob: num(o.prob, 0),
        margin: num(o.margin, 0),
      });
    } catch {
      /* a half-written line is not a flag */
    }
  }
  // Grouped by the CLAIMED label and INSIDE that by the model's word, biggest groups first: a page
  // then carries ONE claim ("FEN bP, Modell empty") and the eye only hunts the outlier (2026-08-15).
  const groupSize = new Map<string, number>();
  const subSize = new Map<string, number>();
  for (const row of rows) {
    groupSize.set(row.fen_label, (groupSize.get(row.fen_label) ?? 0) + 1);
    const sub = `${row.fen_label}|${row.predicted}`;
    subSize.set(sub, (subSize.get(sub) ?? 0) + 1);
  }
  rows.sort(
    (a, b) =>
      (groupSize.get(b.fen_label) ?? 0) - (groupSize.get(a.fen_label) ?? 0) ||
      a.fen_label.localeCompare(b.fen_label) ||
      (subSize.get(`${b.fen_label}|${b.predicted}`) ?? 0) - (subSize.get(`${a.fen_label}|${a.predicted}`) ?? 0) ||
      a.predicted.localeCompare(b.predicted) ||
      b.margin - a.margin,
  );
  const value: AuditFlags = { rows, present: true, staleSince };
  cache.set(file, { key, value });
  return value;
}
