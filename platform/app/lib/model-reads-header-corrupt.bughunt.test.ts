import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { chainState } from "@/lib/chain";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/**
 * `headerOf` beantwortet einen Lesefehler mit `{}`, und `{}` heisst in `stillCurrent`
 * "ungestempelt, gilt weiter". Eine leere oder halb geschriebene `model-reads.jsonl` — genau das,
 * was ein gestoppter `model-read` hinterlaesst — schliesst damit die letzte Maschinen-Sprosse:
 * die Kette schickt den Menschen nach `labeln`, wo keine einzige Lesart auf der Platte liegt,
 * und `Strittig` zeigt ihm dort `—` statt der Zellen, wegen derer er gekommen ist.
 */
const NAME = "2026-09-16-11-00-00";

async function fixture(reads: string): Promise<void> {
  const root = await tempDataRoot("reads-header");
  const dir = await writeSession({
    root, name: NAME,
    rows: [{ frame: 100, extra: { settle_dev: [1] } }],
    candidate: { confirmed: true },
  });
  await writeFile(path.join(dir, "model-reads.jsonl"), reads, "utf8");
  const reports = path.join(root, "reports", "temporal-mattes", NAME);
  await mkdir(reports, { recursive: true });
  await writeFile(path.join(reports, "pass.json"), "{}", "utf8");
}

test("Kontrolle: eine ungestempelte, aber echte Zeile gilt — so liegt heute alles auf der Platte", async () => {
  await fixture(JSON.stringify({ frame: "000100", square: "e2", label: "wP" }) + "\n");
  const state = await chainState(NAME);
  expect(state.hasModelReads).toBe(true);
  expect(state.step).toBe("labeln");
});

test("eine leere `model-reads.jsonl` ist kein gelesener Lauf", async () => {
  await fixture("");
  const state = await chainState(NAME);
  expect(
    state.hasModelReads,
    "BUG: `headerOf` macht aus dem Parse-Fehler `{}`, und `{}` gilt als gueltiger Lauf",
  ).toBe(false);
});

test("eine abgeschnittene erste Zeile ist kein gelesener Lauf", async () => {
  await fixture('{"_source": {"log": "1:2"}, "frame": "0001');
  expect(
    (await chainState(NAME)).hasModelReads,
    "BUG: derselbe `catch` — der Stempel, gegen den geprueft werden sollte, faellt weg",
  ).toBe(false);
});
