/**
 * Die gemeldeten Hände ins `log.jsonl` übernehmen — billig, also ohne Knopf und ohne Heavy-Slot:
 * im Slot wartete es auf genau den SAM-Lauf, den es vorbereitet. SAM 3 bleibt ein Knopf.
 */
import { jobsDir, repoDir, spawnTool, uvBinary } from "@/lib/jobs";
import { checkName } from "@/lib/data";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/** Läuft im Hintergrund weiter: der Strom soll auf einen Log-Write nicht warten. */
export function adoptDirty(name: string): void {
  checkName(name, "game name");
  const args = ["run", "chesslab", "realgames", "adopt-dirty", name];
  void mkdir(jobsDir(), { recursive: true })
    .then(() => {
      const child = spawnTool(uvBinary(), args, repoDir());
      let out = "";
      child.stdout.on("data", (c) => (out += String(c)));
      child.stderr.on("data", (c) => (out += String(c)));
      child.on("close", (code) => {
        void appendFile(path.join(jobsDir(), `${name}.adopt-dirty.log`),
                        `$ adopt-dirty ${name} -> ${code}
${out}
`, "utf8").catch(() => undefined);
      });
    })
    .catch(() => undefined);
}
