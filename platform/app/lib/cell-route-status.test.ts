import { writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { GET } from "@/app/api/cell/[name]/[stem]/[square]/route";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

// Die Route machte aus JEDEM Fehler ein 404, auch aus einer korrupten `log.jsonl`.
let root: string;

const params = (name: string) =>
  ({ params: Promise.resolve({ name, stem: "000100", square: "e4" }) });

const get = (name: string) =>
  GET(new Request(`http://host/api/cell/${name}/000100/e4`), params(name));

beforeEach(async () => {
  root = await tempDataRoot("cell");
});

test("a recording that was never exported is 404, not a server error", async () => {
  expect((await get("nie-exportiert")).status).toBe(404);
});

test("a corrupt log is 500 — the server could not do its job, the client asked correctly", async () => {
  // Exportiert (es gibt ein `candidate.json`), aber der Log ist Muell — das ist NICHT "nicht da".
  const dir = await writeSession({
    root, name: "kaputt", moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  });
  await writeFile(path.join(dir, "log.jsonl"), "{kein json\n", "utf8");

  const res = await get("kaputt");

  expect(res.status).toBe(500);
  expect((await res.json()).error, "der Grund gehoert in den Rumpf").toBeTruthy();
});
