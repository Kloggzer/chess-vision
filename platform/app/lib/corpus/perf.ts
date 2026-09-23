/** The eval artefacts under `data/reports/perf/`. Hard rule: a model name and a result that were not
 *  in the SAME file never appear on one line, so a packless file is grouped as exactly that. */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/session-store/recordings";
import { absentOnly } from "@/lib/measurement";

type Confusion = { true: string; pred: string; count: number };
export type PerfRun = {
  /** From the file's own `model` key, or the key a grouped file files its metrics under. */
  model: string;
  pack: string | null;
  crops: number | null;
  boards: number | null;
  phantoms: number | null;
  misses: number | null;
  cropAcc: number | null;
  occupiedPieceAcc: number | null;
  confusions: Confusion[];
};
export type PerfFile = { file: string; runs: PerfRun[] };

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** `…\models\real13-ms-s3-hn-bn80\model.onnx` → `real13-ms-s3-hn-bn80`; the pack path → its name. */
export function shortName(value: string): string {
  const parts = value.split(/[\\/]/).filter(Boolean);
  const last = parts.pop() ?? value;
  return last === "model.onnx" ? (parts.pop() ?? last) : last;
}

function metrics(row: Record<string, unknown>, model: string, pack: string | null): PerfRun {
  const confusions = Array.isArray(row.top_confusions) ? (row.top_confusions as Confusion[]) : [];
  return {
    model,
    pack,
    crops: num(row.crops),
    boards: num(row.boards),
    phantoms: num(row.phantoms),
    misses: num(row.misses),
    cropAcc: num(row.crop_accuracy),
    occupiedPieceAcc: num(row.occupied_piece_accuracy),
    confusions,
  };
}

/** Flat files carry `model` + `pack` and are one run; comparison files key metrics by model and have
 *  NO pack — that absence is reported, never filled from a sibling file. */
export function parsePerf(file: string, raw: unknown): PerfFile {
  const row = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof row.model === "string") {
    const pack = typeof row.pack === "string" ? shortName(row.pack) : null;
    return { file, runs: [metrics(row, shortName(row.model), pack)] };
  }
  const runs: PerfRun[] = [];
  for (const [model, value] of Object.entries(row)) {
    const inner = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
    const overall = (typeof inner.overall === "object" && inner.overall !== null ? inner.overall : null) as Record<string, unknown> | null;
    if (overall) runs.push(metrics(overall, model, null));
  }
  return { file, runs };
}

export type PackGroup = { pack: string | null; runs: (PerfRun & { file: string })[] };

/** Grouped by the pack each run's OWN file names; the packless files land in one honest group. */
export function groupByPack(files: PerfFile[]): PackGroup[] {
  const groups = new Map<string, PackGroup>();
  for (const file of files) {
    for (const run of file.runs) {
      const key = run.pack ?? "";
      const group = groups.get(key) ?? { pack: run.pack, runs: [] };
      group.runs.push({ ...run, file: file.file });
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => (a.pack ?? "￿").localeCompare(b.pack ?? "￿"));
}

/** Crops and boards for a pack header — only when every run in the group agrees on them. */
export function agreed(runs: PerfRun[], key: "crops" | "boards"): number | null {
  const values = new Set(runs.map((run) => run[key]));
  const [only] = [...values];
  return values.size === 1 && only !== null ? only : null;
}

function perfDir(): string {
  return path.join(dataDir(), "reports", "perf");
}

/** `sweep_infer_size.py` writes a TEXT log; the veto figure is linked, never parsed (§7.5). */
export async function sweepLog(): Promise<{ file: string; present: boolean }> {
  const file = path.join(perfDir(), "sweep_infer_size.log");
  return { file, present: (await stat(file).catch(absentOnly)) !== null };
}

export async function loadPerf(): Promise<PerfFile[]> {
  const entries = await readdir(perfDir(), { withFileTypes: true }).catch(absentOnly);
  if (entries === null) return [];
  const names = entries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name).sort();
  const files = await Promise.all(
    names.map(async (name) => parsePerf(name, JSON.parse(await readFile(path.join(perfDir(), name), "utf8")))),
  );
  return files.filter((file) => file.runs.length > 0);
}
