/** Der Stift und `occluders recut` bei freiem Slot: ein laufender Job schreibt womoeglich dieselben
 *  Dateien. Die Pixel legt der Store ab (`session-store/matte-fix.ts`), hier wird gefragt und gestartet. */
import { busy } from "@/lib/chain/slot";
import { runChesslabCapture } from "@/lib/chain/spawn";
import { lastLine } from "@/lib/chain/session-delete";
import * as fix from "@/lib/session-store/matte-fix";
import { matteStamp } from "@/lib/session-store/matte";
import { checkName } from "@/lib/session-store/recordings";

function whileIdle(name: string, stem: string): void {
  checkName(name, "game name");
  checkName(stem, "frame");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Dateien");
}

export async function saveFixedAlpha(name: string, stem: string, maskPng: Buffer): Promise<string> {
  whileIdle(name, stem);
  return fix.saveFixedAlpha(name, stem, maskPng);
}

export async function clearAlpha(name: string, stem: string): Promise<string> {
  whileIdle(name, stem);
  return fix.clearAlpha(name, stem);
}

export async function restoreAlpha(name: string, stem: string): Promise<string> {
  whileIdle(name, stem);
  return fix.restoreAlpha(name, stem);
}

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
