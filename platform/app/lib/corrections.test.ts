import { appendFile, mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { appendCorrections, correctionsPath, decidedKeys, judgedKeys } from "@/lib/corrections";

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

test("a retract row takes the cell out of the judged map and leaves Python a normal label", async () => {
  await post([{ session_id: "rg-rec-1", frame: "004211", square: "e2", label: "occluded" }]);
  expect((await judgedKeys("rg-rec-1")).has("004211|e2")).toBe(true);

  // `z` after the flush: the label the cell falls back to, plus the tombstone.
  const response = await post([
    { session_id: "rg-rec-1", frame: "004211", square: "e2", label: "wR", retract: true },
  ]);
  expect(response.status).toBe(200);

  // The board reopens — this is the half a plain superseding row cannot do.
  expect((await decidedKeys("rg-rec-1")).has("004211|e2")).toBe(false);
  expect((await judgedKeys("rg-rec-1")).has("004211|e2")).toBe(false);

  // And `load_corrections` reads four keys with last line winning: `wR` is the training label.
  const last = JSON.parse((await readFile(file, "utf8")).trimEnd().split("\n").pop()!);
  expect(last).toMatchObject({ square: "e2", label: "wR", retract: true });
});

test("the reviewed ledger is untouched by a retract — only corrections carry the tombstone", async () => {
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }], "reviewed");
  await appendCorrections([
    { session_id: "rg-g", frame: "000030", square: "e4", label: "wP", retract: true },
  ]);
  // The review row still says a human looked; the corrections ledger holds no verdict.
  expect((await decidedKeys("rg-g", "reviewed")).has("000030|e4")).toBe(true);
  expect((await decidedKeys("rg-g")).has("000030|e4")).toBe(false);
});

test("a review row is recorded, but never in the training input", async () => {
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }], "reviewed");

  // The file that feeds `chesslab slice` must be byte-for-byte what it was.
  expect(await readFile(correctionsPath(), "utf8")).toBe(EXISTING);
  expect(await decidedKeys("rg-g")).toEqual(new Map());
  // But the work is on the record, and the views read both.
  expect(await decidedKeys("rg-g", "reviewed")).toEqual(new Map([["000030|e4", "wP"]]));
  expect(await judgedKeys("rg-g")).toEqual(new Map([["000030|e4", "wP"]]));
});

test("the ledger cache follows the file: a foreign append is seen, an unchanged file is not re-split", async () => {
  // Python and a second tab write this file too, so the cache may only be keyed on the file's own
  // mtime and size — never on "we last wrote it".
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }]);
  expect((await decidedKeys("rg-g")).get("000030|e4")).toBe("wP");

  await appendFile(
    correctionsPath(),
    '{"session_id": "rg-g", "frame": "000030", "square": "e4", "label": "occluded", "ts": "2026-08-15T00:00:00+00:00"}\n',
    "utf8",
  );
  expect((await decidedKeys("rg-g")).get("000030|e4")).toBe("occluded");

  // A cached map that leaks would be edited by the merge in `judgedKeys` and stay edited.
  const before = await decidedKeys("rg-g");
  before.set("000030|e4", "bK");
  expect((await decidedKeys("rg-g")).get("000030|e4")).toBe("occluded");
});

test("a correction outranks an older review of the same cell", async () => {
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "wP" }], "reviewed");
  await appendCorrections([{ session_id: "rg-g", frame: "000030", square: "e4", label: "occluded" }]);

  expect((await judgedKeys("rg-g")).get("000030|e4")).toBe("occluded");
});
