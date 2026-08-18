/**
 * `data/manifests/audit-flags.jsonl` — the landing surface for the two-halves label audit
 * (CONCEPT.md 4.2, TODO "Datensatz-Qualität per Zwei-Hälften-Kreuztest").
 *
 * READ ONLY. The audit is its own project and writes this file; the stream renders the pair of
 * labels a row carries, ranked by `margin`. Its absence is a `—` chip, never an empty lane
 * pretending to be finished.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isIdentity } from "@/lib/classes";
import { dataDir } from "@/lib/data";

export type AuditFlag = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  /** What the out-of-fold model read there, and how sure it was — printed beside the FEN's word. */
  predicted: string;
  prob: number;
  margin: number;
};

export type AuditFlags = {
  rows: AuditFlag[];
  /** `false` = the producer has not run; the lane renders `—` and says so. */
  present: boolean;
};

export function auditFlagsPath(): string {
  return path.join(dataDir(), "manifests", "audit-flags.jsonl");
}

type Cache = Map<string, { key: string; value: AuditFlags }>;
/** Pinned like `lib/jobs.ts:56` — a module-level Map re-parses on every hot reload. */
const cache: Cache = ((globalThis as { __chesslabAuditFlags?: Cache }).__chesslabAuditFlags ??= new Map());

const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);

/** Margin-descending, which is the order the lane works in — the surest disagreements first. */
export async function loadAuditFlags(): Promise<AuditFlags> {
  const file = auditFlagsPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

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
  const value: AuditFlags = { rows, present: true };
  cache.set(file, { key, value });
  return value;
}
