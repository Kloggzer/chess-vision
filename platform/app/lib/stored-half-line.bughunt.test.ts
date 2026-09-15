import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * `loadStored` parste jede Zeile ungeschuetzt. Eine halb geschriebene riss ueber das `Promise.all`
 * in `storedSessions` die ganze Anfrage mit, statt die eine Zeile — jeder andere jsonl-Leser hier
 * ueberspringt sie.
 */
let dir: string;

const row = (stem: string) =>
  JSON.stringify({ frame: `${stem}.jpg`, ply: 1, fen: "8/8/8/8/8/8/8/8", corners: [[0, 0], [1, 0], [1, 1], [0, 1]] });

beforeEach(async () => {
  dir = await tempDataRoot("stored-half");
  const session = path.join(dir, "recordings", "g", "files", "sessions", "s1");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "log.jsonl"), `${row("000001")}\n{"frame": "0000\n${row("000003")}\n`, "utf8");
});

test("a half-written line costs its own line, not the whole request", async () => {
  const { storedSessions } = await import("@/lib/stored");
  const sessions = await storedSessions("g");
  expect(sessions[0].rows.map((r) => r.stem)).toEqual(["000001", "000003"]);
});
