/**
 * Mutationsprobe 2026-09-22b: zwei Tueren ueberlebten ihre Verfaelschung. Die leere Zeichenkette
 * und der fehlende `rows`-Schluessel standen in keinem Test — die Wachen sind richtig, aber
 * ungedeckt, und eine ungedeckte Wache ist eine, die beim naechsten Umbau lautlos faellt.
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("empty-body");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
});

const post = async (mod: string, body: unknown) => {
  const { POST } = (await import(mod)) as { POST: (r: Request) => Promise<Response> };
  return POST(new Request("http://local/x", { method: "POST", body: JSON.stringify(body) }));
};

const ledger = (file: string) =>
  readFile(path.join(root, "labels", file), "utf8").catch(() => "");

test.each([
  ["leere session_id", { session_id: "", frame: "000002", verdict: "matte" }],
  ["session_id nur aus Leerzeichen", { session_id: "   ", frame: "000002", verdict: "matte" }],
  ["leerer frame", { session_id: "rg-g", frame: "", verdict: "matte" }],
])("frame-verdict weist %s ab und schreibt nichts", async (_label, body) => {
  const res = await post("@/app/api/frame-verdict/route", body);

  expect(res.status).toBe(400);
  expect(await ledger("review-notes.jsonl")).toBe("");
});

test.each([
  ["ohne rows", {}],
  ["rows als Objekt", { rows: { session_id: "rg-g" } }],
])("corrections weist einen Rumpf %s ab und schreibt nichts", async (_label, body) => {
  const res = await post("@/app/api/corrections/route", body);

  // `written: 0` unter 200 liest sich beim Aufrufer als "geschrieben" — deshalb 400.
  expect(res.status).toBe(400);
  expect(await ledger("corrections.jsonl")).toBe("");
});
