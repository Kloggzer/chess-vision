/**
 * Die Politik der drei Treuhaender, Zusicherung fuer Zusicherung — hier die Web-Seite. Zwillinge:
 * `tests/test_io_policy_parity.py` und `JsonlPolicyParityTest.kt`. Wer eine Antwort hier aendert,
 * aendert sie dort mit, sonst laufen die drei wieder auseinander. */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { appendRows, writeFileAtomic } from "@/lib/atomic";
import { jsonlRowsStrict, readJsonl } from "@/lib/jsonl";

const tmpFile = async (name: string, text: string) => {
  const file = path.join(await mkdtemp(path.join(os.tmpdir(), "parity-")), name);
  await writeFile(file, text, "utf8");
  return file;
};

test("1: half last line without newline falls away", () => {
  expect(readJsonl('{"a":1}\n{"a":')).toEqual({ rows: [{ a: 1 }], tail: true, corrupt: 0 });
});

test("2: broken last line WITH newline is damage", () => {
  expect(() => jsonlRowsStrict("x", '{"a":1}\n{"a":\n')).toThrow();
});

test("3: broken line in the middle throws", () => {
  expect(() => jsonlRowsStrict("x", '{"a":1}\n{"a":\n{"b":2}\n')).toThrow();
});

test("4: blank lines are skipped", () => {
  expect(readJsonl('\n{"a":1}\n\n\n').rows).toEqual([{ a: 1 }]);
});

test("5: valid JSON that is no object is skipped", () => {
  for (const line of ["5", "[1,2]", "null", '"hi"']) {
    expect(jsonlRowsStrict("x", `${line}\n{"a":1}\n`)).toEqual([{ a: 1 }]);
  }
});

test("6: a leading BOM is swallowed", () => {
  expect(readJsonl('\uFEFF{"a":1}\n').rows).toEqual([{ a: 1 }]);
});

test("7: CRLF and LF both read", () => {
  expect(readJsonl('{"a":1}\r\n{"b":2}\n').rows).toEqual([{ a: 1 }, { b: 2 }]);
});

test("8: a failed write leaves no side file behind", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "parity-"));
  await expect(writeFileAtomic(path.join(dir, "gone", "x.jsonl"), "{}")).rejects.toThrow();
  expect(await readFile(path.join(dir, "gone"), "utf8").catch((e) => e.code)).toBe("ENOENT");
});

test("9: appending mends the torn tail", async () => {
  const file = await tmpFile("a.jsonl", '{"a":1}\n{"hal');
  await appendRows(file, [{ c: 3 }]);
  expect(readJsonl(await readFile(file, "utf8")).rows).toEqual([{ a: 1 }, { c: 3 }]);
});

test("9b: a torn CR keeps its row and gets its newline", async () => {
  const file = await tmpFile("b.jsonl", '{"a":1}\r\n{"b":2}\r');
  await appendRows(file, [{ c: 3 }]);
  const text = await readFile(file, "utf8");
  expect(readJsonl(text).rows).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  expect(text).not.toMatch(/\r\{/);
});

test("10: an empty file is no rows, a directory is no ENOENT", async () => {
  expect(readJsonl("").rows).toEqual([]);
  const dir = await mkdtemp(path.join(os.tmpdir(), "parity-"));
  expect(await appendRows(path.join(dir, "weg", "x.jsonl"), [{ a: 1 }]).catch((e) => e.code)).toBe("ENOENT");
  expect(await appendRows(dir, [{ a: 1 }]).catch((e) => e.code)).toBe("EISDIR");
});
