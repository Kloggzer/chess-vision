import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { isArchived, saveMeta } from "@/lib/meta";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * `loadMeta` collapses "unreadable file" into "no meta". `saveMeta` merges the patch into that
 * `{}` and writes it back, so one title edit on a half-written `ui-meta.json` erases `archived`.
 */
let root: string;
let file: string;

beforeEach(async () => {
  root = await tempDataRoot("meta");
  const dir = path.join(root, "recordings", "g");
  await mkdir(dir, { recursive: true });
  file = path.join(dir, "ui-meta.json");
});

afterEach(async () => {
  delete process.env.CHESSLAB_DATA_DIR;
  await rm(root, { recursive: true, force: true });
});

it("refuses to overwrite a ui-meta.json it could not read", async () => {
  await saveMeta("g", { archived: true });
  expect(await isArchived("g")).toBe(true);
  // Half-written, as an interrupted writeFile leaves it.
  await writeFile(file, '{"archived": true, "titl', "utf8");

  await expect(
    saveMeta("g", { title: "Partie 7" }),
    "BUG: a corrupt file is read as {} and the archived flag is written away",
  ).rejects.toThrow();
  expect(await readFile(file, "utf8")).not.toBe('{\n  "title": "Partie 7"\n}\n');
});
