import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { chainState } from "@/lib/chain";
import { isUseless, readUseless, setUseless, uselessFlag } from "@/lib/useless";

let data: string;
const NAME = "2026-08-14-20-35-52";

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-useless-"));
  process.env.CHESSLAB_DATA_DIR = data;
  await mkdir(path.join(data, "realgames", NAME), { recursive: true });
});

const file = () => path.join(data, "realgames", NAME, "useless.json");

describe("the nutzlos flag", () => {
  it("is absent until somebody sets it", async () => {
    expect(await readUseless(NAME)).toBeNull();
    expect(await uselessFlag(NAME)).toBeNull();
    expect(isUseless(null)).toBe(false);
  });

  it("writes `at` and an optional reason", async () => {
    const flag = await setUseless(NAME, true, "  Hand liegt die ganze Partie auf dem Brett  ");
    expect(flag).toMatchObject({ reason: "Hand liegt die ganze Partie auf dem Brett" });
    expect(flag?.at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(JSON.parse(await readFile(file(), "utf8"))).toEqual(flag);
  });

  it("keeps no empty reason key", async () => {
    expect(await setUseless(NAME, true, "   ")).not.toHaveProperty("reason");
  });

  it("undoes by stamping, never by deleting — the verdict stays on disk", async () => {
    await setUseless(NAME, true, "unbrauchbar");
    const undone = await setUseless(NAME, false);
    expect(undone).toMatchObject({ reason: "unbrauchbar" });
    expect(undone?.undone_at).toBeTruthy();
    expect(await readUseless(NAME)).toEqual(undone);
    expect(await uselessFlag(NAME)).toBeNull();
  });

  it("re-flagging an undone game starts a fresh verdict", async () => {
    await setUseless(NAME, true, "erst mal weg");
    await setUseless(NAME, false);
    const again = await setUseless(NAME, true);
    expect(again).not.toHaveProperty("undone_at");
    expect(again).not.toHaveProperty("reason");
    expect(isUseless(await readUseless(NAME))).toBe(true);
  });

  it("writes nothing when there is no flag to undo", async () => {
    expect(await setUseless(NAME, false)).toBeNull();
    await expect(readFile(file(), "utf8")).rejects.toThrow();
  });

  it("refuses an overlong reason and a traversal name", async () => {
    await expect(setUseless(NAME, true, "x".repeat(300))).rejects.toThrow("longer");
    await expect(setUseless("../evil", true)).rejects.toThrow("bad game name");
  });
});

describe("a useless game in the chain", () => {
  it("offers no step at all, and the undo gives the step back", async () => {
    await mkdir(path.join(data, "realgames", NAME, "files", "sessions", "20260814-203552"), { recursive: true });
    expect((await chainState(NAME)).step).toBe("label");

    await setUseless(NAME, true, "Kamera stand schief");
    const flagged = await chainState(NAME);
    expect(flagged.step).toBeNull();
    expect(flagged.useless).toMatchObject({ reason: "Kamera stand schief" });

    await setUseless(NAME, false);
    const restored = await chainState(NAME);
    expect(restored.step).toBe("label");
    expect(restored.useless).toBeNull();
  });
});
