/** Der Stift und `occluders recut` bei freiem Slot: ein laufender Job schreibt womoeglich dieselben
 *  Dateien. Die Pixel brennt Python ein (`web_cuts.py`, nur Pixel — Coverage erst mit `recut`). */
import { busy } from "@/lib/chain/slot";
import { runChesslabCapture } from "@/lib/chain/spawn";
import { lastLine } from "@/lib/chain/session-delete";
import { pyCall } from "@/lib/py/worker";
import { fixedMattePath, matteStamp } from "@/lib/session-store/matte";
import { checkName, dataDir } from "@/lib/session-store/recordings";

function whileIdle(name: string, stem: string): void {
  checkName(name, "game name");
  checkName(stem, "frame");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Dateien");
}

async function pen(name: string, stem: string, action: string, mask?: Buffer): Promise<string> {
  whileIdle(name, stem);
  await pyCall("pen", { root: dataDir(), name, stem, action, mask: mask?.toString("base64") ?? null });
  return fixedMattePath(name, stem);
}

/** Auf die HANDFASSUNG, wenn es sie gibt: der Stift schickt nach `pen.reset()` nur den neuen Strich. */
export const saveFixedAlpha = (name: string, stem: string, maskPng: Buffer) => pen(name, stem, "stroke", maskPng);

export const clearAlpha = (name: string, stem: string) => pen(name, stem, "clear");

export const restoreAlpha = (name: string, stem: string) => pen(name, stem, "restore");

/**
 * `alpha-worker` APPENDS to the file `recut` rewrites whole. A fresh mtime means one is mid-run,
 * and rewriting under it would drop the rows it wrote since — so this refuses instead.
 */
const WORKER_QUIET_MS = 60_000;

export async function recutMatte(name: string): Promise<{ done: string }> {
  checkName(name, "game name");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Manifeste");
  const age = Date.now() - (await matteStamp(name));
  if (age < WORKER_QUIET_MS) {
    throw new Error("matte.jsonl wurde gerade geschrieben — der alpha-worker läuft, recut würde seine Zeilen verlieren");
  }
  const run = await runChesslabCapture(["occluders", "recut", name]);
  if (run.code !== 0) throw new Error((run.stderr || run.stdout).trim() || `${run.command} exited ${run.code}`);
  return { done: lastLine(run.stdout) };
}
