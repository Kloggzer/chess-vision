/** Der Stempel rechnet ueber die ROHEN Bytes wie `realgames.write_confirmation`, und der Confirm-POST
 *  urteilt gegen die gezeigte Referenz. Der md5 steht wortgleich in
 *  `tests/test_bug_hunt_20260923_confirm_stamp.py`. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { Contested } from "@/lib/atomic";
import { keptCards } from "@/lib/label/confirm-kept";
import { loadCandidate, referenceDigest, writeConfirmation } from "@/lib/session-store/recordings";
import { buildReviewCards } from "@/lib/label/review-cards";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const NAME = "g";

let afterCandidateRead: (() => Promise<void>) | null = null;
vi.mock("node:fs/promises", async () => {
  const real = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  const readFile = (async (file: Parameters<typeof real.readFile>[0], options?: unknown) => {
    const got = await real.readFile(file, options as never);
    const once = afterCandidateRead;
    if (once && options === "utf8" && String(file).endsWith("candidate.json")) {
      afterCandidateRead = null;
      await once();
    }
    return got;
  }) as typeof real.readFile;
  const mocked = { ...real, readFile };
  return { ...mocked, default: mocked };
});
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

const THREE = [...MOVES, { ply: 3, san: "Nf3", frame: 30 }];
const three = async (prefix: string, name = NAME) =>
  writeSession({ root: await tempDataRoot(prefix), name, moves: THREE });
const cardsOf = async (name: string, indices = [0, 1, 2]) =>
  buildReviewCards({ moves: (await loadCandidate(name)).moves, indices, stems: [] });

// `writeConfirmation` ERSETZT `reviewed_plies`; die Seite muss die vorhandenen Urteile deshalb VORLADEN.
test("ohne Vorladen verliert der zweite Klick das Urteil — das ist die Form, die der Fix schliesst", async () => {
  const dir = await three("confirm-keep");
  expect(await writeConfirmation(NAME, [0, 2])).toEqual([1, 3]);
  // Genau das schickte die Seite bisher: frisch geoeffnet, nichts angeklickt, Knopf gedrueckt.
  expect(await writeConfirmation(NAME, [])).toEqual([]);
  expect((await candidateOf(dir)).reviewed_plies).toEqual([]);
});

test("die Karten laden die gespeicherten reviewed_plies vor", async () => {
  await three("confirm-keep");
  await writeConfirmation(NAME, [0, 2]);
  expect(keptCards(await cardsOf(NAME), (await loadCandidate(NAME)).reviewed_plies ?? [])).toEqual({ 0: true, 2: true });
});

test("mit Vorladen ueberlebt das Urteil den zweiten Klick", async () => {
  await three("confirm-keep");
  await writeConfirmation(NAME, [0, 2]);
  const cards = await cardsOf(NAME);
  const seeded = keptCards(cards, (await loadCandidate(NAME)).reviewed_plies ?? []);
  const kept = cards.filter((c) => seeded[c.id]).flatMap((c) => c.keep);
  expect(await writeConfirmation(NAME, kept)).toEqual([1, 3]);
});

test("ein Frame ohne Nachfolger bleibt auf `keep`, wenn nur ein Teil seiner Plies beurteilt ist", async () => {
  await three("confirm-keep");
  // Keine gespeicherte Bestaetigung: nichts ist vorgeladen, sonst waere der Vorschlag erfunden.
  expect(keptCards(await cardsOf(NAME), [])).toEqual({});
});

test("eine Ply-Nummer, die keine Karte traegt, erfindet keine Karte", async () => {
  await three("confirm-keep");
  expect(keptCards(await cardsOf(NAME, [0]), [2, 3])).toEqual({});
});

/** Die Frame-losen Karten tragen `keep = members`; auch die muessen sich wiederfinden. */
test("ein Mehrfach-Commit zaehlt als beurteilt, wenn jede seiner keep-Plies drin steht", async () => {
  await writeSession({
    root: await tempDataRoot("confirm-multi"), name: "m",
    moves: [{ ply: 1, san: "e4", frame: 10 }, { ply: 2, san: "e5", frame: 10 }, { ply: 3, san: "Nf3", frame: 30 }],
  });
  const cards = await cardsOf("m");
  expect(keptCards(cards, [2])).toEqual({ 0: true });
  expect(keptCards(cards, [1])).toEqual({});
});

/** Ohne dass `/confirm/[name]` den gespeicherten Stand durchreicht, steht der Fix da und wirkt nicht. */
test("die Seite reicht den gespeicherten Stand an die Karten durch", async () => {
  const page = await readFile(path.join(process.cwd(), "app", "confirm", "[name]", "page.tsx"), "utf8");
  expect(page).toMatch(/reviewedPlies=\{candidate\.reviewed_plies/);
  expect(page).toMatch(/struckPlies=\{candidate\.struck_plies/);
  const cards = await readFile(path.join(process.cwd(), "app", "confirm", "[name]", "cards.tsx"), "utf8");
  expect(cards).toMatch(/useState<Record<number, boolean>>\(\(\) => keptCards\(cards, reviewedPlies\)\)/);
  expect(cards).toMatch(/useState<Record<number, boolean>>\(\(\) => struckCards\(gallery, struckPlies\)\)/);
});

// `writeFileAtomic` verhindert nur die HALBE Datei, nicht zwei Schreiber auf demselben Ausgangsstand.
test("zwei gleichzeitige Streichungen verlieren keine — Gestrichenes bleibt gestrichen", async () => {
  const dir = await three("confirm-race");
  await Promise.all([writeConfirmation(NAME, [], [1]), writeConfirmation(NAME, [], [3])]);
  expect((await candidateOf(dir)).struck_plies).toEqual([1, 3]);
});

test("ein fremder Schreiber zwischen Lesen und Umhaengen wird nicht ueberrannt", async () => {
  const dir = await three("confirm-foreign");
  const file = path.join(dir, "candidate.json");
  await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 2. Nf3 *\n", "utf8");
  const foreign = { ...(await candidateOf(dir)), note: "von aussen geschrieben" };
  afterCandidateRead = () => writeFile(file, JSON.stringify(foreign), "utf8");
  await expect(writeConfirmation(NAME, [0])).rejects.toThrow(Contested);
  expect((await candidateOf(dir)).note).toBe("von aussen geschrieben");
});
