/** `gameInfo` faengt `loadCandidate` blank ab. Harmlos, solange der KNOPF aus `chainState` kommt,
 *  das `candidate.json` selbst liest (`peekCandidate`) und bei EACCES wirft — das haelt dieser Test. */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { gameInfo } from "@/lib/chain/game-info";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | string }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  const hop = (name: "stat" | "readFile", file: string, rest: unknown[]) =>
    fail.on !== null && String(file).endsWith(fail.on)
      ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
      : (real[name] as (...a: unknown[]) => Promise<unknown>)(file, ...rest);
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readFile: (file: string, ...rest: unknown[]) => hop("readFile", file, rest),
  };
});

let root = "";
beforeEach(async () => {
  fail.on = null;
  root = await tempDataRoot("game-info");
});

test("ein unlesbares candidate.json wird keine Karte ohne Kandidat — die Karte wirft", async () => {
  await writeSession({ root, moves: [{ ply: 1, san: "e4" }] });
  fail.on = "candidate.json";
  await expect(gameInfo("g", null)).rejects.toThrow(/EACCES/);
});

test("ein halb geschriebenes candidate.json bietet nicht `label` an, das ihn neu schriebe", async () => {
  await writeSession({ root, moves: [{ ply: 1, san: "e4" }] });
  await writeFile(path.join(root, "recordings", "g", "candidate.json"), '{"moves": ["e4"], "confir', "utf8");
  const { info } = await gameInfo("g", null);
  expect(info.chain.hasCandidate).toBe(true);
  expect(info.chain.step).toBe("confirm");
  expect(info.confirmed).toBe(false);
});

test("Gegenprobe: ein lesbarer Kandidat erscheint mit seinen Zuegen", async () => {
  await writeSession({ root, moves: [{ ply: 1, san: "e4" }, { ply: 2, san: "e5" }] });
  const { info } = await gameInfo("g", null);
  expect(info.plies).toBe(2);
  expect(info.chain.hasCandidate).toBe(true);
});
