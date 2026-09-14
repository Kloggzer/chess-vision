/**
 * Was das Handy vor einer Aufnahme wissen muss: offene Auftraege und der Stand des Korpus. Beides
 * sind Berichte auf der Platte, diese Seite liest nur. Form: `docs/capture-plan.schema.json`,
 * Begruendung der vier Achsen: `docs/capture-axes.md`.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";
import { authorized } from "@/lib/ingest";

export type Gap = {
  piece: string;
  square_color: string;
  band: string;
  have: number;
  fix: string;
  corpus_in_band: number;
};

/** Ein Vorschlag: `lo`/`hi` sind das Band, gegen das die App live misst und ggf. umhaengt. */
export type Placement = { square: string; piece: string; band: string; lo: number; hi: number };

export type Shot = {
  id: string;
  reason: string;
  place: Placement[];
  height: string;
  orientations: number;
  closes: Gap[];
};

export type CapturePlan = {
  generated_at: string;
  dataset: string;
  gaps_from: string;
  board_spread: number;
  shots: Shot[];
};

export type EmptyPlan = { shots: Shot[]; why: string };

export type Coverage = { generated_at: string } & Record<string, unknown>;

const PLAN = "capture-plan.json";
const GAPS = "coverage-gaps.json";
const MAKE_PLAN = "uv run chesslab capture plan --dataset real13-mix-v7-128";
const MAKE_GAPS = "uv run python scripts/coverage_gaps.py --dataset real13-mix-v7-128";

function reportPath(file: string): string {
  return path.join(dataDir(), "reports", file);
}

/**
 * Kein Plan ist kein Fehler, sondern ein ungelaufener Befehl — die App zeigt ihn an, statt eine
 * leere Liste als „alles abgedeckt" zu lesen.
 */
export async function loadPlan(): Promise<CapturePlan | EmptyPlan> {
  try {
    return JSON.parse(await readFile(reportPath(PLAN), "utf8")) as CapturePlan;
  } catch {
    return { shots: [], why: MAKE_PLAN };
  }
}

/**
 * Die Abdeckung kann nicht live sein: sie entsteht aus einem gebauten Datensatz, eine frische
 * Aufnahme erscheint erst nach Slice, Export und Dataset-Bau. Deshalb traegt die Antwort die
 * mtime der Datei — der Bericht sagt sein Alter selbst, statt Aktualitaet vorzutaeuschen.
 */
export async function loadCoverage(): Promise<Coverage | EmptyPlan> {
  const file = reportPath(GAPS);
  try {
    const [text, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    return { ...(JSON.parse(text) as Record<string, unknown>), generated_at: info.mtime.toISOString() };
  } catch {
    return { shots: [], why: MAKE_GAPS };
  }
}

async function guarded(request: Request, load: () => Promise<unknown>): Promise<Response> {
  if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });
  return Response.json(await load());
}

export function planResponse(request: Request): Promise<Response> {
  return guarded(request, loadPlan);
}

export function coverageResponse(request: Request): Promise<Response> {
  return guarded(request, loadCoverage);
}
