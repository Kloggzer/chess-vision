/**
 * `data/manifests/audit-flags.jsonl` — the landing surface for the two-halves label audit
 * (CONCEPT.md 4.2, TODO "Datensatz-Qualität per Zwei-Hälften-Kreuztest").
 *
 * READ ONLY. The audit is its own project and writes this file; the stream renders whatever pair
 * of labels a row carries — piece identities, `empty` and `occluded` alike — ranked by `margin`.
 * The file does not exist today, and its absence is a `—` chip, never an empty lane pretending to
 * be finished.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
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
  rows.sort((a, b) => b.margin - a.margin);
  const value: AuditFlags = { rows, present: true };
  cache.set(file, { key, value });
  return value;
}
