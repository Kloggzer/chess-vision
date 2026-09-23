/**
 * Die gemeldeten Hände ins `log.jsonl` übernehmen — billig, also ohne Knopf und ohne Heavy-Slot:
 * im Slot wartete es auf genau den SAM-Lauf, den es vorbereitet. SAM 3 bleibt ein Knopf.
 */
import { repoDir, uvBinary } from "@/lib/chain/cli-args";
import { jobsDir, recordOffSlot } from "@/lib/chain/ledger";
import { spawnTool } from "@/lib/chain/spawn";
import { checkName } from "@/lib/session-store/recordings";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type Started = { started: true } | { started: false; error: string };
/** Je Aufnahme EIN Lauf; `again` heisst: die Notizen haben sich seit seinem Lesen geaendert. */
type Run = { running: boolean; again: boolean; failed: boolean };
const runs: Map<string, Run> = ((globalThis as { __chesslabAdoptDirty?: Map<string, Run> }).__chesslabAdoptDirty ??= new Map());

/**
 * Aufgelöst ist der START, nicht der Lauf (`background-work-must-announce-failure`). Laeuft schon
 * einer, folgt ihm genau EIN weiterer, der die Notizen frisch liest — so gewinnt ein Widerruf.
 */
export async function adoptDirty(name: string): Promise<Started> {
  checkName(name, "game name");
  const run = runs.get(name) ?? { running: false, again: false, failed: false };
  runs.set(name, run);
  if (run.running) {
    run.again = true;
    return { started: true };
  }
  run.running = true;
  return launch(name, run);
}

async function launch(name: string, run: Run): Promise<Started> {
  const args = ["run", "chesslab", "realgames", "adopt-dirty", name];
  try {
    await mkdir(jobsDir(), { recursive: true });
    const child = spawnTool(uvBinary(), args, repoDir());
    let out = "";
    let spawned = false;
    child.stdout.on("data", (c) => (out += String(c)));
    child.stderr.on("data", (c) => (out += String(c)));
    child.on("close", (code) => {
      if (spawned) void finished(name, run, code, out);
    });
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", () => {
        spawned = true;
        resolve();
      });
      child.once("error", reject);
    });
    return { started: true };
  } catch (error) {
    run.running = false;
    return { started: false, error: String(error) };
  }
}

async function finished(name: string, run: Run, code: number | null, out: string): Promise<void> {
  await appendFile(path.join(jobsDir(), `${name}.adopt-dirty.log`),
                   `$ adopt-dirty ${name} -> ${code}\n${out}\n`, "utf8").catch(() => undefined);
  const failed = code !== 0;
  // Nur das Scheitern (und die Erholung danach) in den Ledger: eine `done`-Zeile je Meldung
  // verdeckte in `jobOf` den letzten Kettenschritt der Aufnahme.
  if (failed || run.failed) await status(name, failed ? tail(out, code) : undefined);
  run.failed = failed;
  if (!run.again) {
    run.running = false;
    return;
  }
  run.again = false;
  const next = await launch(name, run);
  if (!next.started) {
    run.failed = true;
    await status(name, `adopt-dirty sprang nicht an: ${next.error}`);
  }
}

async function status(name: string, reason: string | undefined): Promise<void> {
  const now = new Date().toISOString();
  await recordOffSlot({ name, kind: "adopt-dirty", state: reason ? "failed" : "done", queuedAt: now, finishedAt: now,
                        command: `chesslab realgames adopt-dirty ${name}`, log: path.join(jobsDir(), `${name}.adopt-dirty.log`),
                        ...(reason ? { reason } : {}) }).catch(() => undefined);
}

function tail(out: string, code: number | null): string {
  const last = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-3).join(" | ");
  return `chesslab realgames adopt-dirty exited ${code}${last ? `: ${last.slice(-400)}` : ""}`;
}
