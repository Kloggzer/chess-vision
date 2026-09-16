/**
 * `data/reports/correction-violations.jsonl` (READ ONLY), from `realgames audit-corrections`:
 * frames whose CORRECTED board breaks a rule occlusion cannot cause. It proves the PAIR is wrong,
 * never which half — a stale FEN with a right correction trips the same wire as the reverse.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";
import { jsonlRows } from "@/lib/jsonl";

export type CorrectionViolation = {
  session_id: string;
  frame: string;
  ply?: number;
  /** python-chess status names, e.g. `TOO_MANY_WHITE_PAWNS` — printed verbatim, never translated. */
  violations: string[];
  /** `{square: label}` of the corrections applied to this frame — the squares the lane highlights. */
  corrections: Record<string, string>;
};

export type CorrectionViolations = {
  rows: CorrectionViolation[];
  /** `false` = the audit has not run; the lane renders `—` and says so. */
  present: boolean;
};

export function correctionViolationsPath(): string {
  return path.join(dataDir(), "reports", "correction-violations.jsonl");
}

type Cache = Map<string, { key: string; value: CorrectionViolations }>;
/** Pinned like `lib/jobs.ts:56` — a module-level Map re-parses on every hot reload. */
const cache: Cache = ((globalThis as { __chesslabViolations?: Cache }).__chesslabViolations ??= new Map());

const labels = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const [square, label] of Object.entries(v as Record<string, unknown>)) out[square] = String(label);
  }
  return out;
};

/** File order, which is session then frame — the stream re-orders them anyway. */
export async function loadCorrectionViolations(): Promise<CorrectionViolations> {
  const file = correctionViolationsPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    const missing: CorrectionViolations = { rows: [], present: false };
    cache.set(file, { key, value: missing });
    return missing;
  }

  const rows: CorrectionViolation[] = [];
  for (const o of jsonlRows(text)) {
    if (typeof o.session_id !== "string" || !Array.isArray(o.violations)) continue;
    const corrections = labels(o.corrections);
    // A row without a corrected square carries no verdict a human could rule on, and the board
    // would land in the lane with nothing outlined.
    if (o.violations.length === 0 || Object.keys(corrections).length === 0) continue;
    rows.push({
      session_id: o.session_id,
      frame: String(o.frame),
      ...(typeof o.ply === "number" ? { ply: o.ply } : {}),
      violations: o.violations.map(String),
      corrections,
    });
  }
  const value: CorrectionViolations = { rows, present: true };
  cache.set(file, { key, value });
  return value;
}
