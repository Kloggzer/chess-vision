/**
 * Was das Handy vor einer Aufnahme wissen muss: offene Auftraege und der Stand des Korpus. Beides
 * sind Berichte auf der Platte, diese Seite liest nur. Form: `docs/capture-plan.schema.json`,
 * Begruendung der vier Achsen: `docs/capture-axes.md`.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/session-store/recordings";
import { authorized } from "@/lib/ingest/ingest";
import { absentOnly } from "@/lib/measurement";

type Gap = {
  piece: string;
  square_color: string;
  band: string;
  have: number;
  fix: string;
  corpus_in_band: number;
};

/** Ein Vorschlag: `lo`/`hi` sind das Band, gegen das die App live misst und ggf. umhaengt;
 *  `seen_lo`/`seen_hi` die p5/p95 DIESES Feldes — ob es das Band je erreicht hat. */
type Placement = {
  square: string; piece: string; band: string; lo: number; hi: number;
  seen_lo?: number; seen_hi?: number;
};

type Shot = {
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
  const text = await readFile(reportPath(PLAN), "utf8").catch(absentOnly);
  // Nur ein FEHLENDER Bericht ist ein ungelaufener Befehl. Ein halber meldete sonst `shots: []`
  // und riet zu genau dem Befehl, der ihn ueberschreibt — der Fehler waere damit weg.
  if (text === null) return { shots: [], why: MAKE_PLAN };
  return JSON.parse(text) as CapturePlan;
}

/** Nicht live: die Abdeckung entsteht aus einem gebauten Datensatz. Die Antwort traegt deshalb die
 *  mtime — der Bericht sagt sein Alter selbst. */
export async function loadCoverage(): Promise<Coverage | EmptyPlan> {
  const file = reportPath(GAPS);
  const read = await Promise.all([readFile(file, "utf8"), stat(file)]).catch(absentOnly);
  if (read === null) return { shots: [], why: MAKE_GAPS };
  const [text, info] = read;
  return { ...(JSON.parse(text) as Record<string, unknown>), generated_at: info.mtime.toISOString() };
}

async function guarded(request: Request, load: () => Promise<unknown>): Promise<Response> {
  if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });
  try {
    return Response.json(await load());
  } catch (error) {
    // Ein halber Bericht darf das Handy nicht auf Next' HTML-500 werfen: es liest `{error}` und
    // haette sonst nur "Netzwerkfehler" zu zeigen.
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export function planResponse(request: Request): Promise<Response> {
  return guarded(request, loadPlan);
}

export function coverageResponse(request: Request): Promise<Response> {
  return guarded(request, loadCoverage);
}
