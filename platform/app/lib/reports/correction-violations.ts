/**
 * `data/reports/correction-violations.jsonl` (READ ONLY), from `realgames audit-corrections`:
 * frames whose CORRECTED board breaks a rule occlusion cannot cause. It proves the PAIR is wrong,
 * never which half — a stale FEN with a right correction trips the same wire as the reverse.
 */
import path from "node:path";
import { dataDir } from "@/lib/session-store/recordings";
import { loadMeasurement, type Measurement } from "@/lib/measurement";

export type CorrectionViolation = {
  session_id: string;
  frame: string;
  ply?: number;
  /** python-chess status names, e.g. `TOO_MANY_WHITE_PAWNS` — printed verbatim, never translated. */
  violations: string[];
  /** `{square: label}` of the corrections applied to this frame — the squares the lane highlights. */
  corrections: Record<string, string>;
};

/** `measured: false` = the audit has not run; the lane renders `—` and says so. */
export type CorrectionViolations = Measurement<{ rows: CorrectionViolation[] }>;

export function correctionViolationsPath(): string {
  return path.join(dataDir(), "reports", "correction-violations.jsonl");
}

const labels = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const [square, label] of Object.entries(v as Record<string, unknown>)) out[square] = String(label);
  }
  return out;
};

/** File order, which is session then frame — the stream re-orders them anyway. */
export function loadCorrectionViolations(): Promise<CorrectionViolations> {
  return loadMeasurement(correctionViolationsPath(), parse);
}

function parse(lines: Record<string, unknown>[]): { rows: CorrectionViolation[] } {
  const rows: CorrectionViolation[] = [];
  for (const o of lines) {
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
  return { rows };
}
