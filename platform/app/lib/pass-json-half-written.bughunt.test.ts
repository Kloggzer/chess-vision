import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { chainState } from "@/lib/chain";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/**
 * `readFile(passFile).then(parse, () => null)` faengt nur den LESEfehler. Ein `JSON.parse`, das im
 * `onFulfilled` wirft, reisst das `Promise.all` mit und `chainState` wirft — also jede Seite, die
 * die Queue liest, fuer die GANZE Aufnahmeliste, wegen einer Datei.
 *
 * Die `candidate.json` zwei Zeilen tiefer macht es ausdruecklich andersherum ("kein Grund, die
 * ganze Queue-Seite zu leeren"); dieselbe Frage, zwei Antworten.
 */
const NAME = "2026-09-16-12-00-00";

async function fixture(pass: string): Promise<void> {
  const root = await tempDataRoot("pass-half");
  await writeSession({
    root, name: NAME,
    rows: [{ frame: 100, extra: { settle_dev: [1] } }],
    candidate: { confirmed: true },
  });
  const reports = path.join(root, "reports", "temporal-mattes", NAME);
  await mkdir(reports, { recursive: true });
  await writeFile(path.join(reports, "pass.json"), pass, "utf8");
}

test("Kontrolle: eine fehlende `pass.json` haelt ihre Sprosse offen", async () => {
  const root = await tempDataRoot("pass-none");
  await writeSession({
    root, name: NAME,
    rows: [{ frame: 100, extra: { settle_dev: [1] } }],
    candidate: { confirmed: true },
  });
  expect((await chainState(NAME)).step).toBe("temporal");
});

test("eine halb geschriebene `pass.json` darf die Kette nicht werfen", async () => {
  await fixture('{"adopted": 3');
  const state = await chainState(NAME);
  expect(state.hasTemporalPass, "BUG: chainState wirft, statt die Sprosse offen zu lassen").toBe(false);
});
