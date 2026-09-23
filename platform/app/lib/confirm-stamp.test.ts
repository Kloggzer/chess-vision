/**
 * W2/W3: der Stempel rechnet ueber die ROHEN Bytes wie `realgames.write_confirmation`, und der
 * Confirm-POST urteilt gegen die Referenz, die die Seite zeigte. Der md5 steht wortgleich in
 * `tests/test_bug_hunt_20260923_confirm_stamp.py`.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { referenceDigest } from "@/lib/data";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const NAME = "g";
// BOM und CRLF: wer normalisiert statt die rohen Bytes zu hashen, rechnet hier etwas anderes.
const PGN = Buffer.from('﻿[Event "W2"]\r\n\r\n1. e4 e5 *\r\n', "utf8");
const PGN_MD5 = "5c6da1fbf57ec1d48056dff3958c2080";
const OTHER = "1. d4 d5 *\n";
const MOVES = [
  { ply: 1, san: "e4", frame: 10 },
  { ply: 2, san: "e5", frame: 20 },
];

async function game(reference: Buffer | null): Promise<string> {
  const root = await tempDataRoot("confirm-stamp");
  const dir = await writeSession({ root, name: NAME, moves: MOVES });
  if (reference !== null) await writeFile(path.join(dir, "reference.pgn"), reference);
  return dir;
}

async function confirm(body: Record<string, unknown>): Promise<Response> {
  const { POST } = await import("@/app/api/confirm/[name]/route");
  const request = new Request(`http://x/api/confirm/${NAME}`, { method: "POST", body: JSON.stringify(body) });
  return POST(request, { params: Promise.resolve({ name: NAME }) });
}

const candidateOf = async (dir: string) => JSON.parse(await readFile(path.join(dir, "candidate.json"), "utf8"));

test("der Stempel ist der md5 der rohen Bytes — derselbe Wert wie auf der Python-Seite", async () => {
  expect(referenceDigest(PGN)).toBe(PGN_MD5);
  const dir = await game(PGN);
  expect((await confirm({ kept: [] })).status).toBe(200);
  const doc = await candidateOf(dir);
  expect(doc.confirmed_reference).toEqual({ md5: PGN_MD5, at: doc.confirmed_at });
});

test("ersetzt waehrend der Pruefung: 409, und die Bestaetigung wird nicht geschrieben", async () => {
  const dir = await game(PGN);
  await writeFile(path.join(dir, "reference.pgn"), OTHER, "utf8");
  const res = await confirm({ kept: [], reference_md5: PGN_MD5 });
  expect(res.status).toBe(409);
  expect((await res.json()).error).toMatch(/Referenz wurde waehrend der Pruefung ersetzt/);
  expect((await candidateOf(dir)).confirmed).not.toBe(true);
});

test("die gezeigte Referenz ist noch da: bestaetigt und gegen sie gestempelt", async () => {
  const dir = await game(PGN);
  expect((await confirm({ kept: [], reference_md5: PGN_MD5 })).status).toBe(200);
  expect((await candidateOf(dir)).confirmed_reference.md5).toBe(PGN_MD5);
});

test("die Seite zeigte KEINE Referenz, inzwischen liegt eine: 409; ohne Referenz: 200 mit md5 null", async () => {
  const dir = await game(null);
  await writeFile(path.join(dir, "reference.pgn"), PGN);
  expect((await confirm({ kept: [], reference_md5: null })).status).toBe(409);

  const bare = await game(null);
  expect((await confirm({ kept: [], reference_md5: null })).status).toBe(200);
  expect((await candidateOf(bare)).confirmed_reference.md5).toBeNull();
});

test("ein alter Client ohne reference_md5 bestaetigt wie bisher gegen die Referenz von jetzt", async () => {
  const dir = await game(PGN);
  await writeFile(path.join(dir, "reference.pgn"), OTHER, "utf8");
  expect((await confirm({ kept: [] })).status).toBe(200);
  const doc = await candidateOf(dir);
  expect(doc.confirmed_reference).toEqual({ md5: referenceDigest(Buffer.from(OTHER, "utf8")), at: doc.confirmed_at });
});
