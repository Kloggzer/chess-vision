import { mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const slot = vi.hoisted(() => ({ busy: false, calls: [] as string[][], code: 0, stdout: "", stderr: "" }));
vi.mock("@/lib/chain/slot", async (original) => ({
  ...(await original<typeof import("@/lib/chain/slot")>()),
  busy: () => slot.busy,
}));
vi.mock("@/lib/chain/spawn", async (original) => ({
  ...(await original<typeof import("@/lib/chain/spawn")>()),
  runChesslabCapture: async (args: string[]) => {
    slot.calls.push(args);
    return { code: slot.code, stdout: slot.stdout, stderr: slot.stderr, command: `uv run chesslab ${args.join(" ")}` };
  },
}));

const { clearAlpha, recutMatte, restoreAlpha, saveFixedAlpha } = await import("@/lib/chain/matte-edit");

const NAME = "2026-09-23-12-00-00";
const STEM = "000123";
let game = "";

beforeEach(async () => {
  const root = await tempDataRoot("matte-edit");
  game = path.join(root, "recordings", NAME);
  await mkdir(path.join(game, "mattes"), { recursive: true });
  Object.assign(slot, { busy: false, calls: [], code: 0, stdout: "", stderr: "" });
});

const alpha = (side: number) =>
  sharp(Buffer.alloc(side * side, 200), { raw: { width: side, height: side, channels: 1 } }).webp({ lossless: true }).toBuffer();

/** matte.jsonl, zuletzt vor [agoMs] geschrieben — frisch heisst: der alpha-worker laeuft. */
async function matteWrittenAgo(agoMs: number): Promise<void> {
  const file = path.join(game, "matte.jsonl");
  await writeFile(file, "{}\n", "utf8");
  const at = new Date(Date.now() - agoMs);
  await utimes(file, at, at);
}

describe("ein belegter Slot sperrt jeden Schreibweg des Stifts", () => {
  test.each([
    ["saveFixedAlpha", () => saveFixedAlpha(NAME, STEM, Buffer.alloc(1))],
    ["clearAlpha", () => clearAlpha(NAME, STEM)],
    ["restoreAlpha", () => restoreAlpha(NAME, STEM)],
    ["recutMatte", () => recutMatte(NAME)],
  ])("%s", async (_, write) => {
    slot.busy = true;
    await expect(write()).rejects.toThrow(/ein Job läuft gerade/);
    expect(slot.calls).toEqual([]);
  });

  test("ein ungueltiger Name faellt vor der Slot-Frage", async () => {
    slot.busy = true;
    await expect(clearAlpha("../x", STEM)).rejects.toThrow(/game name/);
  });
});

describe("die Schreibwege bei freiem Slot", () => {
  test("clearAlpha legt ein leeres Alpha in SAMs Groesse neben SAMs Schnitt", async () => {
    await writeFile(path.join(game, "mattes", `${STEM}.webp`), await alpha(6));
    const file = await clearAlpha(NAME, STEM);
    expect(file).toBe(path.join(game, "mattes", `${STEM}.fixed.webp`));
    const { data, info } = await sharp(await readFile(file)).greyscale().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([6, 6]);
    expect(Math.max(...data)).toBe(0);
  });

  test("restoreAlpha nimmt die Handfassung weg, SAMs Schnitt bleibt", async () => {
    await writeFile(path.join(game, "mattes", `${STEM}.webp`), await alpha(4));
    await clearAlpha(NAME, STEM);
    await restoreAlpha(NAME, STEM);
    await expect(readFile(path.join(game, "mattes", `${STEM}.fixed.webp`))).rejects.toThrow(/ENOENT/);
    expect((await readFile(path.join(game, "mattes", `${STEM}.webp`))).length).toBeGreaterThan(0);
  });
});

describe("recutMatte", () => {
  test("verweigert, solange matte.jsonl frisch ist — der alpha-worker verloere seine Zeilen", async () => {
    await matteWrittenAgo(1_000);
    await expect(recutMatte(NAME)).rejects.toThrow(/alpha-worker läuft/);
    expect(slot.calls).toEqual([]);
  });

  test("startet `occluders recut <name>` und meldet dessen letzte Zeile", async () => {
    await matteWrittenAgo(120_000);
    slot.stdout = "recut 3 frames\n  12 cells moved  \n\n";
    expect(await recutMatte(NAME)).toEqual({ done: "12 cells moved" });
    expect(slot.calls).toEqual([["occluders", "recut", NAME]]);
  });

  test("ein Exit ungleich 0 wirft mit den Worten des Werkzeugs", async () => {
    slot.code = 2;
    slot.stderr = "refused: no matte.jsonl\n";
    await expect(recutMatte(NAME)).rejects.toThrow("refused: no matte.jsonl");
  });
});
