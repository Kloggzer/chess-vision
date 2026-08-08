import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

/** A row a previous session wrote — the writer must never touch it. */
const EXISTING =
  '{"session_id": "rg-old", "frame": "000001", "square": "a1", "label": "occluded", ' +
  '"ts": "2026-08-01T00:00:00+00:00"}\n';

let file: string;

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-corrections-"));
  await mkdir(path.join(root, "manifests"), { recursive: true });
  file = path.join(root, "manifests", "corrections.jsonl");
  await writeFile(file, EXISTING, "utf8");
  process.env.CHESSLAB_DATA_DIR = root;
});

async function post(rows: unknown) {
  const { POST } = await import("@/app/api/corrections/route");
  return POST(
    new Request("http://localhost/api/corrections", {
      method: "POST",
      body: JSON.stringify({ rows }),
    }),
  );
}

test("the corrections POST appends schema-valid rows and rewrites nothing", async () => {
  const response = await post([
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "occluded" },
    { session_id: "rg-rec-1", frame: "004211", square: "e3", label: "wQ" },
  ]);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ written: 2 });

  const text = await readFile(file, "utf8");
  expect(text.startsWith(EXISTING)).toBe(true); // append-only: the prefix is byte-identical
  const lines = text.trimEnd().split("\n");
  expect(lines.length).toBe(3);

  const row = JSON.parse(lines[1]);
  expect(Object.keys(row).sort()).toEqual(["frame", "label", "session_id", "square", "ts"]);
  expect(row).toMatchObject({
    session_id: "rg-rec-1",
    frame: "004211",
    square: "e2",
    label: "occluded",
  });
  expect(row.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);
  expect(text.endsWith("\n")).toBe(true);
});

test("a row outside the schema is refused whole — nothing of the batch lands", async () => {
  for (const bad of [
    { session_id: "rg-rec-1", frame: "004211", square: "e9", label: "occluded" },
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "hand" },
    { session_id: "../escape", frame: "004211", square: "e2", label: "empty" },
    { session_id: "rg-rec-1", frame: "../../etc", square: "e2", label: "empty" },
  ]) {
    expect((await post([bad])).status, JSON.stringify(bad)).toBe(400);
  }
  expect(await readFile(file, "utf8")).toBe(EXISTING);
});

test("an undo is a superseding row, because load_corrections is last-line-wins", async () => {
  await post([{ session_id: "rg-rec-1", frame: "004211", square: "e2", label: "occluded" }]);
  await post([{ session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wQ" }]);
  const { decidedKeys } = await import("@/lib/corrections");
  expect((await decidedKeys("rg-rec-1")).get("004211|e2")).toBe("wQ");
});
