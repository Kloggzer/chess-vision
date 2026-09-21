/**
 * Auch die Matte-Sprosse prueft HERKUNFT, nicht Existenz.
 *
 * `pass.json` und `model-reads.jsonl` tragen den Stempel seit 2026-09-15, `matte.jsonl` nicht — die
 * Sprosse schloss also auf Alphas, die vor dem letzten Re-Export geschnitten wurden. Genau dort
 * driftet die gespeicherte `coverage` gegen ihre Crops (13 von 24 Aufnahmen).
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, it } from "vitest";
import { chainState } from "@/lib/chain";
import { tempDataRoot } from "@/lib/test-fixtures";

let data: string;
const NAME = "2026-08-13-12-10-55";
const STEMS = ["1", "2", "3", "4", "5"];

beforeEach(async () => {
  data = await tempDataRoot("matte-source");
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
});

const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);

/** Eine Aufnahme, bei der NUR noch die Herkunft der Alphas offen sein kann. */
async function exported(): Promise<void> {
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed: true }));
  await writeFile(game("log.jsonl"), STEMS.map((i) => JSON.stringify({
    frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1, dirty: true,
    dirty_reason: "occluded", settle_dev: [1.0],
  })).join("\n") + "\n");
  await mkdir(path.join(data, "reports", "temporal-mattes", NAME), { recursive: true });
  const source = { log: await logStamp() };
  await writeFile(path.join(data, "reports", "temporal-mattes", NAME, "pass.json"),
    JSON.stringify({ upserted: 0, _source: source }) + "\n");
  await writeFile(game("model-reads.jsonl"), JSON.stringify({ _model: "runs/p4a-80-clahe", _source: source }) + "\n");
}

async function logStamp(): Promise<string> {
  const s = await stat(game("log.jsonl"));
  return `${Math.floor(s.mtimeMs)}:${s.size}`;
}

async function mattes(rows: { frame: string; _source?: unknown }[]): Promise<void> {
  await writeFile(game("matte.jsonl"),
    rows.map((r) => JSON.stringify({ ply: 1, coverage: { a8: 0.9 }, ...r })).join("\n") + "\n");
}

it("laesst eine Matte OHNE Stempel gelten — alles, was heute auf der Platte liegt", async () => {
  await exported();
  await mattes(STEMS.map((frame) => ({ frame })));
  expect((await chainState(NAME)).step).toBe("labeln");
});

it("schliesst die Sprosse, wenn der Stempel zur log.jsonl passt", async () => {
  await exported();
  const _source = { log: await logStamp() };
  await mattes(STEMS.map((frame) => ({ frame, _source })));
  expect((await chainState(NAME)).step).toBe("labeln");
});

it("macht die Sprosse wieder auf, wenn die Alphas vor dem letzten Export geschnitten wurden", async () => {
  await exported();
  const fresh = { log: await logStamp() };
  await mattes(STEMS.map((frame, i) => ({ frame, _source: i === 0 ? { log: "1:2" } : fresh })));
  const state = await chainState(NAME);
  expect(state.step).toBe("matte");
  expect(Object.keys(state.outdated)).toContain("matte");
  expect(state.reason).toMatch(/recut-coverage/);
});

it("haelt nicht an einer Zeile fest, die dieser Export gar nicht mehr fuehrt", async () => {
  await exported();
  const fresh = { log: await logStamp() };
  await mattes([...STEMS.map((frame) => ({ frame, _source: fresh })),
                { frame: "99", _source: { log: "1:2" } }]);
  expect((await chainState(NAME)).step).toBe("labeln");
});
