// Ein stilles `catch` macht aus dem Urteil eines Menschen ein "gab es nie"; der Schwanz: `pool.test.ts`.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { loadPool } from "@/lib/corpus/pool";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

// Der Pool liest die Ledger seit 2026-09-23 in Python (`ioutil.read_jsonl`, `labeling.load_corrections`).
test("eine kaputte Zeile mittendrin verschwindet nicht stillschweigend", async () => {
  const dir = await writeSession({ root: await tempDataRoot("silent-line"), rows: [{ frame: 1 }] });
  const A = '{"session_id":"rg-g","frame":"000001","square":"a1","label":"wP"}';
  const B = '{"session_id":"rg-g","frame":"000002","square":"b2","label":"wQ"}';
  await writeFile(path.join(dir, "corrections.jsonl"), `${A}\n{"session_id":"rg-a","fra\n${B}\n`, "utf8");
  await expect(loadPool()).rejects.toThrow();
});
