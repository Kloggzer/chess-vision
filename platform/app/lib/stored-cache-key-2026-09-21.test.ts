/**
 * Der Cache schluesselt auf mtime UND Groesse. Die mtime allein liess zwei Schreibungen in
 * derselben Millisekunde — und jede Kopie mit erhaltenen Zeitstempeln — als unveraendert gelten,
 * und die Seite bekam die alten Ecken weiter serviert.
 */
import { mkdir, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { storedSessions } from "@/lib/stored";
import { tempDataRoot } from "@/lib/test-fixtures";

const NAME = "2026-09-21-16-00-00";
const STAMP = new Date("2026-09-21T16:00:00Z");
let dir: string;

const row = (ply: number) =>
  JSON.stringify({ frame: `frames/${String(ply).padStart(4, "0")}.jpg`, ply, fen: "8/8/8/8/8/8/8/8 w - - 0 1", corners: [] });

async function log(plies: number[]): Promise<void> {
  const file = path.join(dir, "log.jsonl");
  await writeFile(file, plies.map(row).join("\n") + "\n", "utf8");
  await utimes(file, STAMP, STAMP);
}

beforeEach(async () => {
  dir = path.join(await tempDataRoot("stored-cache"), "recordings", NAME, "files", "sessions", "20260921-160000");
  await mkdir(dir, { recursive: true });
});

test("gleiche mtime, andere Groesse — die Zeilen werden neu gelesen", async () => {
  await log([1]);
  expect((await storedSessions(NAME))[0].rows).toHaveLength(1);

  await log([1, 2]);
  expect((await storedSessions(NAME))[0].rows).toHaveLength(2);
});
