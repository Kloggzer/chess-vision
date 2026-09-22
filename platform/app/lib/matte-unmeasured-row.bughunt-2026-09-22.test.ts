/**
 * Zwei Waechter in `lib/matte.ts`, die die Mutationsprobe am 2026-09-22 ungefangen liess.
 *
 * Beide tragen dieselbe Regel wie CLAUDE.md: eine `matte.jsonl`-Zeile ohne `coverage` ist NICHT
 * GEMESSEN, und eine spaetere Absage nimmt eine fruehere Messung zurueck. Ohne sie schliesst die
 * Matte-Sprosse auf Zeilen, hinter denen kein Alpha liegt.
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, it } from "vitest";
import { chainState } from "@/lib/chain";
import { matteCensus, matteSources } from "@/lib/matte";
import { tempDataRoot } from "@/lib/test-fixtures";

let data: string;
const NAME = "2026-08-13-12-10-55";
const STEMS = ["1", "2", "3", "4", "5"];
const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);

beforeEach(async () => {
  data = await tempDataRoot("matte-unmeasured");
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed: true }));
  await writeFile(game("log.jsonl"), STEMS.map((i) => JSON.stringify({
    frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1, dirty: true,
    dirty_reason: "occluded", settle_dev: [1.0],
  })).join("\n") + "\n");
  await mkdir(path.join(data, "reports", "temporal-mattes", NAME), { recursive: true });
  const _source = { log: await logStamp() };
  await writeFile(path.join(data, "reports", "temporal-mattes", NAME, "pass.json"),
    JSON.stringify({ upserted: 0, _source }) + "\n");
  await writeFile(game("model-reads.jsonl"), JSON.stringify({ _model: "runs/p4a-80-clahe", _source }) + "\n");
});

async function logStamp(): Promise<string> {
  const s = await stat(game("log.jsonl"));
  return `${Math.floor(s.mtimeMs)}:${s.size}`;
}

const mattes = (rows: Record<string, unknown>[]) =>
  writeFile(game("matte.jsonl"), rows.map((r) => JSON.stringify({ ply: 1, ...r })).join("\n") + "\n");

it("eine Zeile ohne `coverage` ist ungemessen, nicht erledigt", async () => {
  await mattes(STEMS.map((frame) => ({ frame })));

  expect((await matteCensus(NAME)).done).toBe(0);
  const state = await chainState(NAME);
  expect(state.step).toBe("matte");
  expect(state.reason).toMatch(/^0 von 5/);
});

it("eine spaetere Absage nimmt den Stempel der frueheren Messung zurueck", async () => {
  const fresh = { log: await logStamp() };
  await mattes([
    { frame: "1", coverage: { a8: 0.9 }, _source: { log: "1:2" } },
    { frame: "1", skipped: "zone too big", _source: { log: "1:2" } },
    ...STEMS.slice(1).map((frame) => ({ frame, coverage: { a8: 0.9 }, _source: fresh })),
  ]);

  expect(await matteSources(NAME)).toEqual([fresh.log]);
});
