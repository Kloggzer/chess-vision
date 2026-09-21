/**
 * Der Stempel hat ZWEI Haelften, und jede faengt einen Re-Export, den die andere durchlaesst: die
 * Groesse den, der die Mtime-Toleranz von 1 ms trifft, die Mtime den, der gleich viele Bytes
 * schreibt (derselbe Zeilensatz neu geschnitten). Beide Haelften einzeln entfernt liessen die
 * Suite gruen — der bestehende Fall bewegt immer beide zugleich.
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { chainState } from "@/lib/chain";
import { tempDataRoot } from "@/lib/test-fixtures";

let data: string;
const NAME = "2026-08-13-12-10-55";
const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);

beforeEach(async () => {
  data = await tempDataRoot("stamp-halves");
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed: true }));
  const rows = [1, 2, 3, 4, 5].map((i) => JSON.stringify(
    { frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1, settle_dev: [1.0, 2.0] }));
  await writeFile(game("log.jsonl"), rows.join("\n") + "\n");
});

/** Der Lauf ist durch, und er nennt den Stempel, den er damals gesehen hat. */
async function passStamped(log: string): Promise<void> {
  const dir = path.join(data, "reports", "temporal-mattes", NAME);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "pass.json"), JSON.stringify({ upserted: 3, _source: { log } }) + "\n");
}

const now = async () => stat(game("log.jsonl"));

test("gleiche Groesse, verschobene Mtime: der Lauf ist veraltet", async () => {
  const s = await now();
  await passStamped(`${Math.floor(s.mtimeMs) - 60_000}:${s.size}`);

  const state = await chainState(NAME);
  expect(state.step, "ein Re-Export gleicher Groesse blieb unbemerkt").toBe("temporal");
  expect(Object.keys(state.outdated)).toContain("temporal");
});

test("gleiche Mtime, andere Groesse: der Lauf ist veraltet", async () => {
  const s = await now();
  await passStamped(`${Math.floor(s.mtimeMs)}:${s.size - 40}`);

  const state = await chainState(NAME);
  expect(state.step, "ein Re-Export in derselben Millisekunde blieb unbemerkt").toBe("temporal");
  expect(Object.keys(state.outdated)).toContain("temporal");
});

/** Die 1-ms-Toleranz selbst bleibt: Python bodenlegt dieselbe Zeit ueber Sekunden-Floats. */
test("eine Millisekunde Abstand bei gleicher Groesse gilt weiter", async () => {
  const s = await now();
  await passStamped(`${Math.floor(s.mtimeMs) - 1}:${s.size}`);
  await writeFile(game("model-reads.jsonl"), JSON.stringify({ _model: "runs/p4a-80-clahe" }) + "\n");

  expect((await chainState(NAME)).step).toBe("labeln");
});
