import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { loadMeta, saveMeta } from "@/lib/meta";

async function withGame(name = "g") {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-meta-"));
  await mkdir(path.join(root, "recordings", name), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
}

test("meta round-trips, patches merge, and empty values delete", async () => {
  await withGame();
  expect(await loadMeta("g")).toEqual({});
  await saveMeta("g", { title: "  Carlsen–Shevchenko  " });
  expect(await loadMeta("g")).toEqual({ title: "Carlsen–Shevchenko" });
  await saveMeta("g", { archived: true });
  expect(await loadMeta("g")).toEqual({ title: "Carlsen–Shevchenko", archived: true });
  await saveMeta("g", { title: "", archived: false });
  expect(await loadMeta("g")).toEqual({});
});

test("a title past the limit and a traversal name are refused", async () => {
  await withGame();
  await expect(saveMeta("g", { title: "x".repeat(200) })).rejects.toThrow("longer");
  await expect(saveMeta("../evil", { archived: true })).rejects.toThrow("bad game name");
});
