import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { GET as progressGet } from "@/app/api/chain/[name]/progress/route";
import { POST as correctionsPost } from "@/app/api/corrections/route";
import { POST as verdictPost } from "@/app/api/frame-verdict/route";
import { GET as metaGet, POST as metaPost } from "@/app/api/meta/[name]/route";
import { GET as queryGet } from "@/app/api/query/route";
import { POST as notesPost } from "@/app/api/review-notes/route";
import { POST as sessionPost } from "@/app/api/session/[id]/route";
import { POST as unusablePost } from "@/app/api/unusable-cells/route";
import { POST as notePost } from "@/app/api/zuege/[name]/note/route";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const ctx = <T>(params: T) => ({ params: Promise.resolve(params) }) as never;
const post = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

/** Ein Verzeichnis unter dem Namen der Datei: jedes Lesen und Anhaengen wirft EISDIR. */
async function blocked(file: string): Promise<void> {
  await mkdir(file, { recursive: true });
}

async function recording(prefix: string): Promise<{ root: string; dir: string }> {
  const root = await tempDataRoot(prefix);
  return { root, dir: await writeSession({ root, name: "g", rows: [{ frame: 1 }] }) };
}

const cell = { session_id: "rg-g", frame: "000001", square: "e4", label: "wP" };

test("chain/progress: ein unlesbares jobs.jsonl ist 500", async () => {
  const { root } = await recording("qa-offen-progress");
  expect((await progressGet(new Request("http://x"), ctx({ name: ".." }))).status).toBe(400);
  await blocked(path.join(root, "inbox", "jobs.jsonl"));
  const res = await progressGet(new Request("http://x"), ctx({ name: "g" }));
  expect(res.status, "BUG: EISDIR als Clientfehler").toBe(500);
});

test("corrections: ein nicht beschreibbares Ledger ist 500, eine unbekannte Aufnahme 404", async () => {
  const { dir } = await recording("qa-offen-corrections");
  await blocked(path.join(dir, "corrections.jsonl"));
  expect((await correctionsPost(post({ rows: [cell] }))).status, "BUG: EISDIR als Clientfehler").toBe(500);
  expect((await correctionsPost(post({ rows: [{ ...cell, session_id: "rg-nirgends" }] }))).status).toBe(404);
  expect((await correctionsPost(post({ rows: [{ ...cell, square: "z9" }] }))).status).toBe(400);
  expect((await correctionsPost(post("{kaputt"))).status).toBe(400);
});

test("unusable-cells: ein nicht beschreibbares Ledger ist 500", async () => {
  const { dir } = await recording("qa-offen-unusable");
  await blocked(path.join(dir, "unusable-cells.jsonl"));
  expect((await unusablePost(post({ rows: [cell] }))).status, "BUG: EISDIR als Clientfehler").toBe(500);
  expect((await unusablePost(post({ rows: [{ ...cell, square: "z9" }] }))).status).toBe(400);
});

test("meta: eine kaputte ui-meta.json ist 500, ein falsches Feld 400", async () => {
  const { dir } = await recording("qa-offen-meta");
  expect((await metaPost(post({ archived: "ja" }), ctx({ name: "g" }))).status).toBe(400);
  expect((await metaPost(post("{kaputt"), ctx({ name: "g" }))).status).toBe(400);
  await writeFile(path.join(dir, "ui-meta.json"), "{kaputt", "utf8");
  expect((await metaGet(new Request("http://x"), ctx({ name: "g" }))).status, "BUG: kaputte Datei als 400").toBe(500);
  expect((await metaPost(post({ title: "x" }), ctx({ name: "g" }))).status, "BUG: kaputte Datei als 400").toBe(500);
});

test("query: unlesbare Lesarten sind 500, eine falsche Frage 400", async () => {
  const { dir } = await recording("qa-offen-query");
  await blocked(path.join(dir, "model-reads.jsonl"));
  expect((await queryGet(new Request("http://x/api/query?class=wP"))).status, "BUG: EISDIR als 400").toBe(500);
  expect((await queryGet(new Request("http://x/api/query?class=occluded"))).status).toBe(400);
  expect((await queryGet(new Request("http://x/api/query?min=abc"))).status).toBe(400);
});

test("frame-verdict: ein unlesbares Log ist 500, ein unbekannter Frame 404", async () => {
  const { dir } = await recording("qa-offen-verdict");
  const body = { session_id: "rg-g", frame: "000009", verdict: "unusable" };
  expect((await verdictPost(post(body))).status, "BUG: ein fehlender Frame als 400").toBe(404);
  await writeFile(path.join(dir, "log.jsonl"), "{kaputt\n", "utf8");
  expect((await verdictPost(post({ ...body, frame: "000001" }))).status, "BUG: kaputtes Log als 400").toBe(500);
  expect((await verdictPost(post({ ...body, verdict: "egal" }))).status).toBe(400);
});

test("zuege/note: ein nicht beschreibbarer Zettel ist 500", async () => {
  const { root } = await recording("qa-offen-note");
  await blocked(path.join(root, "labels", "review-notes.jsonl"));
  expect((await notePost(post({ ply: 3 }), ctx({ name: "g" }))).status, "BUG: EISDIR als 400").toBe(500);
  expect((await notePost(post({ ply: -1 }), ctx({ name: "g" }))).status).toBe(400);
});

test("review-notes: ein nicht beschreibbarer Zettel ist 500", async () => {
  const { root } = await recording("qa-offen-notes");
  await blocked(path.join(root, "labels", "review-notes.jsonl"));
  const row = { session_id: "rg-g", frame: "000001", verdict: "matte-wanted" };
  expect((await notesPost(post({ rows: [row] }))).status, "BUG: EISDIR als 400").toBe(500);
  expect((await notesPost(post({ rows: [{ ...row, verdict: "egal" }] }))).status).toBe(400);
});

test("session: ohne CHESSLAB_DATA_DIR ist das Loeschen ein Serverfehler", async () => {
  await tempDataRoot("qa-offen-session");
  const before = process.env.CHESSLAB_DATA_DIR;
  delete process.env.CHESSLAB_DATA_DIR;
  try {
    const res = await sessionPost(post({ dryRun: true }), ctx({ id: "rg-g" }));
    expect(res.status, "BUG: eine fehlende Konfiguration als 400").toBe(500);
  } finally {
    process.env.CHESSLAB_DATA_DIR = before;
  }
  expect((await sessionPost(post({ dryRun: true }), ctx({ id: ".." }))).status).toBe(400);
});
