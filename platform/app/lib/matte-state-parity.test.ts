/** Die fuenf Zustaende einer `matte.jsonl`-Zeile — DASSELBE Fixture wie `tests/test_matte_state_parity.py`.
 *  Sie zu verwechseln war vier Mal ein Bug (Absage als sauberes Brett, fehlend als 0). */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { loadMatte } from "@/lib/session-store/matte";
import { tempDataRoot } from "@/lib/test-fixtures";

const FIXTURE = path.join(
  __dirname,
  "../../../android/core-engine/src/test/resources/parity/_matte/matte_states.json",
);

type Expect = { stem: string; state: string; covered_over_visible_max: string[]; max: number | null };
type Case = { rows: Record<string, unknown>[]; expect: Expect[] };

async function fixture(): Promise<Case> {
  return JSON.parse(await readFile(FIXTURE, "utf8")) as Case;
}

/** Die ECHTE Lesefunktion, nicht eine Kopie ihrer Regeln — sonst prueft der Test sich selbst. */
async function decode(rows: Record<string, unknown>[]) {
  const dir = await tempDataRoot("matte-states");
  const sdir = path.join(dir, "recordings", "s");
  await mkdir(sdir, { recursive: true });
  await writeFile(path.join(sdir, "matte.jsonl"),
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return loadMatte("s");
}

test("die Absage ist als solche erkennbar, die fehlende Zeile als fehlend", async () => {
  const { rows, expect: want } = await fixture();
  const matte = await decode(rows);

  for (const w of want) {
    const seen = matte.get(w.stem);
    if (w.state === "missing") expect(seen, w.stem).toBeUndefined();
    if (w.state === "refused") {
      expect(seen?.skipped, w.stem).toBeTruthy();
      expect(seen?.coverage, `${w.stem}: eine Absage ist keine leere Messung`).toBeUndefined();
    }
    if (w.state === "measured") expect(seen?.skipped, w.stem).toBeUndefined();
  }
});

test("eine leere Messung ist eine Messung — hier weicht Python ab", async () => {
  // `read_matte` filtert `if r.get("coverage")` und verwirft das leere Dict; diese Seite behaelt
  // es ausdruecklich (`label-stream.ts`: "Nullen BLEIBEN"). Die Divergenz steht als `xfail` in
  // `tests/test_matte_state_parity.py` und in der Entscheidungsvorlage.
  const { rows } = await fixture();
  expect((await decode(rows)).get("000020")?.coverage).toBeDefined();
});

test("die Zahlen sind auf beiden Seiten dieselben", async () => {
  const { rows, expect: want } = await fixture();
  const matte = await decode(rows);

  for (const w of want.filter((x) => x.state === "measured")) {
    const cover = matte.get(w.stem)!.coverage!;
    const over = Object.entries(cover).filter(([, v]) => v > 0.15).map(([sq]) => sq).sort();
    expect(over, w.stem).toEqual(w.covered_over_visible_max);
    expect(Math.max(0, ...Object.values(cover)), w.stem).toBe(w.max);
  }
});
