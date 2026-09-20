/**
 * `lcsReport`/`reviewedPlies` against `tests/data/lcs_parity.json` — the file
 * `tests/test_lcs_parity.py` pins the Python side on. One fixture, two readers, because the CLI
 * and this view are supposed to report the same three numbers about the same candidate.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { lcsReport, reviewedPlies } from "@/lib/lcs";

type Case = {
  truth: string[];
  cand: string[];
  matched: [number, number][];
  invented: number[];
  missed: number[];
  kept: number[];
  reviewedPlies: number[];
};

const CASES = (
  JSON.parse(
    readFileSync(path.join(__dirname, "../../../tests/data/lcs_parity.json"), "utf8"),
  ) as { cases: Case[] }
).cases;

test("the fixture is the shared one, not a stub", () => {
  expect(CASES.length).toBeGreaterThanOrEqual(10);
});

test("lcsReport matches the shared fixture", () => {
  for (const c of CASES) {
    const got = lcsReport(c.truth, c.cand);
    const where = `${c.truth.join(",")} vs ${c.cand.join(",")}`;
    expect(got.matched, where).toEqual(c.matched);
    expect(got.invented, where).toEqual(c.invented);
    expect(got.missed, where).toEqual(c.missed);
  }
});

test("reviewedPlies matches the shared fixture", () => {
  for (const c of CASES) {
    const moves = c.cand.map((_, j) => ({ ply: j + 1 }));
    const { matched } = lcsReport(c.truth, c.cand);
    expect(reviewedPlies(moves, matched, c.kept)).toEqual(c.reviewedPlies);
  }
});
