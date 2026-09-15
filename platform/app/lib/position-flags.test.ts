import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "position-flags-"));
  await mkdir(path.join(dir, "reports"), { recursive: true });
  vi.doMock("@/lib/data", () => ({ dataDir: () => dir }));
  vi.resetModules();
  (globalThis as { __chesslabPositionFlags?: Map<string, unknown> }).__chesslabPositionFlags?.clear();
});
afterEach(() => vi.doUnmock("@/lib/data"));

const load = () => import("@/lib/position-flags");
const write = (text: string) => writeFile(path.join(dir, "reports", "position-flags.jsonl"), text, "utf8");

const HEAD = '{"_settle_limit": 15.0, "_seen_min": 0.5, "_written_at": "2026-08-22T09:00:00+00:00"}';
const row = (square: string, dev: number) =>
  `{"session_id": "rg-g", "frame": "000100", "square": "${square}", "fen_label": "wP", ` +
  `"ply": 3, "dev": ${dev}, "cov": 0.02, "seen": 0.98, "reason": "changed"}`;

test("the independent temporal score survives loading without becoming coverage", async () => {
  const { loadPositionFlags } = await load();
  await write(JSON.stringify({ ...JSON.parse(row("a2", 18)), reason: "temporal", temporal_score: 0.43 }));
  expect((await loadPositionFlags()).rows[0]).toMatchObject({
    reason: "temporal", temporal_score: 0.43, dev: 18, matte_cov: 0.02,
  });
});

test("die größte Abweichung zuerst — dort ist am ehesten wirklich etwas anderes im Bild", async () => {
  const { loadPositionFlags } = await load();
  await write(`${HEAD}\n${row("a2", 18.4)}\n${row("a3", 41.2)}\n`);

  const { rows, present } = await loadPositionFlags();

  expect(present).toBe(true);
  expect(rows.map((r) => [r.square, r.dev])).toEqual([
    ["a3", 41.2],
    ["a2", 18.4],
  ]);
  expect(rows[0]).toEqual({
    session_id: "rg-g", frame: "000100", square: "a3", fen_label: "wP",
    dev: 41.2, matte_cov: 0.02, reason: "changed",
  });
});

test("keine Datei ist `present: false` — die Lane rendert `—`, nicht 0", async () => {
  const { loadPositionFlags, positionFlagsPath } = await load();
  expect(positionFlagsPath()).toBe(path.join(dir, "reports", "position-flags.jsonl"));
  expect(await loadPositionFlags()).toEqual({ rows: [], present: false });
});

test("Kopfzeile, halbe Zeile und Zeile ohne Messwert werden übersprungen, nicht fatal", async () => {
  const { loadPositionFlags } = await load();
  await write(`${HEAD}\n{"session_id": "rg-g", "square"\n{"session_id": "rg-g", "square": "a2"}\n${row("a3", 9)}\n`);

  const { rows } = await loadPositionFlags();

  expect(rows.map((r) => r.square)).toEqual(["a3"]);
});
