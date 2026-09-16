/**
 * Die fuenf Zustaende einer `matte.jsonl`-Zeile — DASSELBE Fixture wie `tests/test_matte_state_parity.py`.
 *
 * Von keiner Seite geschrieben, von beiden gelesen, wie `parity/_geometry/mesh_crop_parity.json`.
 * Die Zustaende zu verwechseln war am 2026-09-15/16 vier Mal ein Bug: SAMs Absage als sauberes
 * Brett, eine fehlende Matte als `coverage 0`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const FIXTURE = path.join(
  __dirname,
  "../../../android/core-engine/src/test/resources/parity/_matte/matte_states.json",
);

type Expect = { stem: string; state: string; covered_over_visible_max: string[]; max: number | null };
type Case = { rows: Record<string, unknown>[]; expect: Expect[] };

async function fixture(): Promise<Case> {
  return JSON.parse(await readFile(FIXTURE, "utf8")) as Case;
}

/** Wie `lib/matte.ts` es liest: eine Zeile mit `skipped` traegt keine Messung. */
function decode(rows: Record<string, unknown>[]) {
  const out = new Map<string, { skipped?: string; coverage: Record<string, number> }>();
  for (const row of rows) {
    const stem = String(row.frame);
    out.set(stem, {
      ...(row.skipped ? { skipped: String(row.skipped) } : {}),
      coverage: (row.coverage ?? {}) as Record<string, number>,
    });
  }
  return out;
}

test("die Absage ist als solche erkennbar, die fehlende Zeile als fehlend", async () => {
  const { rows, expect: want } = await fixture();
  const matte = decode(rows);

  for (const w of want) {
    const seen = matte.get(w.stem);
    if (w.state === "missing") expect(seen, w.stem).toBeUndefined();
    if (w.state === "refused") expect(seen?.skipped, w.stem).toBeTruthy();
    if (w.state === "measured") expect(seen?.skipped, w.stem).toBeUndefined();
  }
});

test("eine leere Messung ist eine Messung — hier weicht Python ab", async () => {
  // `read_matte` filtert `if r.get("coverage")` und verwirft das leere Dict; diese Seite behaelt
  // es ausdruecklich (`label-stream.ts`: "Nullen BLEIBEN"). Die Divergenz steht als `xfail` in
  // `tests/test_matte_state_parity.py` und in der Entscheidungsvorlage.
  const { rows } = await fixture();
  expect(decode(rows).get("000020")).toBeDefined();
});

test("die Zahlen sind auf beiden Seiten dieselben", async () => {
  const { rows, expect: want } = await fixture();
  const matte = decode(rows);

  for (const w of want.filter((x) => x.state === "measured")) {
    const cover = matte.get(w.stem)!.coverage;
    const over = Object.entries(cover).filter(([, v]) => v > 0.15).map(([sq]) => sq).sort();
    expect(over, w.stem).toEqual(w.covered_over_visible_max);
    expect(Math.max(0, ...Object.values(cover)), w.stem).toBe(w.max);
  }
});
