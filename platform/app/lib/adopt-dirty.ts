/**
 * Die gemeldeten Hände ins `log.jsonl` übernehmen — billig, also ohne Knopf und ohne Heavy-Slot:
 * im Slot wartete es auf genau den SAM-Lauf, den es vorbereitet. SAM 3 bleibt ein Knopf.
 */
import { jobsDir, repoDir, spawnTool, uvBinary } from "@/lib/jobs";
import { checkName } from "@/lib/data";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Aufgelöst ist der START, nicht der Lauf: der Strom soll auf einen Log-Write nicht warten, aber
 * ein Prozess, der nie ansprang, darf nicht still verschwinden (`background-work-must-announce-failure`).
 */
export async function adoptDirty(name: string): Promise<{ started: true } | { started: false; error: string }> {
  checkName(name, "game name");
  const args = ["run", "chesslab", "realgames", "adopt-dirty", name];
  try {
    await mkdir(jobsDir(), { recursive: true });
    const child = spawnTool(uvBinary(), args, repoDir());
    let out = "";
    child.stdout.on("data", (c) => (out += String(c)));
    child.stderr.on("data", (c) => (out += String(c)));
    child.on("close", (code) => {
      void appendFile(path.join(jobsDir(), `${name}.adopt-dirty.log`),
                      `$ adopt-dirty ${name} -> ${code}\n${out}\n`, "utf8").catch(() => undefined);
    });
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    return { started: true };
  } catch (error) {
    return { started: false, error: String(error) };
  }
}
