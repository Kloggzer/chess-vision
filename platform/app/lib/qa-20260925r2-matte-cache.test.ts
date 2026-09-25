/** QA 2026-09-25 Runde 2 ueber den echten Weg: Route -> Worker -> `web_cuts.py`. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";
import { GET as matteGet, POST as mattePost } from "@/app/api/matte/[name]/[stem]/route";
import { tempDataRoot, writeLog, writeSession } from "@/lib/test-fixtures";

const SIDE = 64;
const grey = (v: number, channels: 1 | 3) =>
  sharp(Buffer.alloc(SIDE * SIDE * channels, v), { raw: { width: SIDE, height: SIDE, channels } }).webp({ lossless: true }).toBuffer();

test("the alpha under one URL changes with a pen stroke, so the browser must not keep it for an hour", async () => {
  const root = await tempDataRoot("qa-r2-matte-cache");
  const dir = await writeSession({ root, moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }] });
  await writeLog(dir, [{ frame: 110, fen: "x", boardBorder: 0, boardSize: SIDE }]);
  await mkdir(path.join(dir, "boards"), { recursive: true });
  await mkdir(path.join(dir, "mattes"), { recursive: true });
  await writeFile(path.join(dir, "boards", "000110.webp"), await grey(90, 3));
  await writeFile(path.join(dir, "mattes", "000110.webp"), await grey(200, 1));
  const params = { params: Promise.resolve({ name: "g", stem: "000110" }) };
  const get = () => matteGet(new Request("http://x/api/matte/g/000110?size=128"), params);

  const before = await get();
  expect(before.status, await before.clone().text()).toBe(200);
  const cleared = await mattePost(new Request("http://x/api/matte/g/000110", { method: "POST", body: '{"clear":true}' }), params);
  expect(cleared.status, await cleared.clone().text()).toBe(200);
  const after = await get();
  expect(Buffer.from(await after.arrayBuffer())).not.toEqual(Buffer.from(await before.arrayBuffer()));

  // grid.tsx und cell-lane.tsx fragen dieselbe URL ohne `?v=`: nur der Header zwingt zum Nachfragen.
  expect(before.headers.get("cache-control"), "BUG: max-age haelt das alte Alpha im Browser").toMatch(/no-cache|no-store/);
});
