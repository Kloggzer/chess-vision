import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { GET } from "@/app/api/cell/[name]/[stem]/[square]/route";

/**
 * Im ganzen TS-API gab es keine einzige 500: diese Route machte aus JEDEM Fehler ein 404 — aus
 * einer korrupten `log.jsonl` genauso wie aus einem fehlenden Frame. Das `<img>` zeigt beides als
 * kaputtes Bild, und den Rumpf liest niemand; unterscheidbar war es nur noch von Hand.
 */
let root: string;

const params = (name: string) =>
  ({ params: Promise.resolve({ name, stem: "000100", square: "e4" }) });

const get = (name: string) =>
  GET(new Request(`http://host/api/cell/${name}/000100/e4`), params(name));

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chesslab-cell-"));
  process.env.CHESSLAB_DATA_DIR = root;
});

test("a recording that was never exported is 404, not a server error", async () => {
  expect((await get("nie-exportiert")).status).toBe(404);
});

test("a corrupt log is 500 — the server could not do its job, the client asked correctly", async () => {
  // Exportiert (es gibt ein `candidate.json`), aber der Log ist Muell — das ist NICHT "nicht da".
  const dir = path.join(root, "recordings", "kaputt");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "candidate.json"), JSON.stringify({
    name: "kaputt", clock: { fps: 25 }, geometry: { board_size: 928 },
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  }), "utf8");
  await writeFile(path.join(dir, "log.jsonl"), "{kein json\n", "utf8");

  const res = await get("kaputt");

  expect(res.status).toBe(500);
  expect((await res.json()).error, "der Grund gehoert in den Rumpf").toBeTruthy();
});
