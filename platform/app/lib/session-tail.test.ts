/**
 * Eine halbe LETZTE Zeile ist ein laufender Export, kein Defekt.
 *
 * `realgames.py` oeffnet `log.jsonl` mit `"w"` und stroemt hinein. `loadSession` warf darauf und
 * kostete damit die ganze Seite — waehrend `stored.ts` und `pool.ts` dieselbe Zeile stillschweigend
 * uebersprangen. Drei Leser, drei Antworten; jetzt eine.
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { loadSession } from "@/lib/session";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const NAME = "2026-08-13-12-10-55";
let dir = "";

beforeEach(async () => {
  const root = await tempDataRoot("session-tail");
  dir = await writeSession({
    root, name: NAME,
    rows: [{ frame: 1, ply: 1 }, { frame: 2, ply: 1 }, { frame: 3, ply: 2 }],
    moves: [{ ply: 1, frame: 1 }, { ply: 2, frame: 3 }],
  });
});

const logPath = () => path.join(dir, "log.jsonl");

test("eine halb geschriebene letzte Zeile kostet die Seite nicht", async () => {
  const before = (await loadSession(NAME)).rows.length;
  await appendFile(logPath(), '{"frame": "frames/0099', "utf8");

  const after = await loadSession(NAME);

  expect(after.rows.length).toBe(before);
});

test("eine kaputte Zeile MITTEN drin wird gemeldet, nicht verschluckt", async () => {
  const text = await readFile(logPath(), "utf8");
  const lines = text.split("\n").filter((l) => l.trim());
  await writeFile(logPath(), [lines[0], '{"kaputt', ...lines.slice(1)].join("\n") + "\n", "utf8");

  await expect(loadSession(NAME)).rejects.toThrow(/beschaedigte Zeile/);
});
