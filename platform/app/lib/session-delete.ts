/**
 * `chesslab session delete` from the UI: the dry run's numbers, then the same command for real.
 * Nothing is recounted here — a dialog promising other numbers than the deletion performs is
 * worse than no dialog, so both steps run one verb and this file only reads its output.
 */
import { checkName } from "@/lib/data";
import { busy, runChesslabCapture } from "@/lib/jobs";

/** What `--dry-run` prints, verbatim: the one JSON line of `sessions.deletion_cost`. */
export type DeletionCost = {
  session_id: string;
  frames: number;
  crops: number;
  corrections: number;
};

/** The LAST parsable line wins — `uv` may print its own noise before the verb ever runs. */
export function parseCost(stdout: string): DeletionCost | null {
  let found: DeletionCost | null = null;
  for (const line of stdout.split("\n")) {
    const text = line.trim();
    if (!text.startsWith("{")) continue;
    try {
      const { session_id: id, frames, crops, corrections } = JSON.parse(text) as Partial<DeletionCost>;
      // Nicht gemessen ist nicht null: `frames ?? 0` machte aus einer halben Zeile
      // "0 Frames, 0 Crops", und der Dialog versprach eine kostenlose Loeschung.
      if (typeof id === "string" && [frames, crops, corrections].every((v) => typeof v === "number")) {
        found = { session_id: id, frames: Number(frames), crops: Number(crops), corrections: Number(corrections) };
      }
    } catch {
      /* not the line we came for */
    }
  }
  return found;
}

/** The tool's own last word — what the dialog reports instead of inventing a success sentence. */
export const lastLine = (stdout: string): string =>
  stdout.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";

/**
 * Refused while the one job slot is taken: `delete_session` rewrites the shared manifests, and an
 * export running beside it is writing the same files.
 */
function blocked(): string | null {
  return busy() ? "ein Job läuft gerade — der schreibt womöglich dieselben Manifeste" : null;
}

export async function deletionCost(id: string): Promise<{ cost: DeletionCost } | { error: string }> {
  const sid = checkName(id, "session id");
  const stop = blocked();
  if (stop) return { error: stop };
  const run = await runChesslabCapture(["session", "delete", sid, "--dry-run"]);
  const cost = parseCost(run.stdout);
  if (run.code !== 0 || !cost) {
    return { error: (run.stderr || run.stdout).trim() || `${run.command} exited ${run.code}` };
  }
  return { cost };
}

export async function deleteSession(id: string): Promise<{ deleted: string } | { error: string }> {
  const sid = checkName(id, "session id");
  const stop = blocked();
  if (stop) return { error: stop };
  const run = await runChesslabCapture(["session", "delete", sid, "--yes"]);
  if (run.code !== 0) return { error: (run.stderr || run.stdout).trim() || `${run.command} exited ${run.code}` };
  return { deleted: lastLine(run.stdout) };
}
