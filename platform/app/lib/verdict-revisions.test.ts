/**
 * Drei Wege, auf denen ein menschliches Urteil still verloren ging: das Handy-PGN ueberschrieb
 * eine gerade hochgeladene Referenz, und eine Bestaetigung galt weiter, nachdem der Mensch die
 * Referenz ersetzt hatte, gegen die sie gefallen war. Alles ueber die echten Routen.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const hook = vi.hoisted(() => ({ onRead: null as null | ((file: string) => Promise<void>) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    readFile: async (file: unknown, ...rest: unknown[]) => {
      const run = hook.onRead;
      if (run) await run(String(file));
      return (real.readFile as (...a: unknown[]) => unknown)(file, ...rest);
    },
  };
});

beforeEach(async () => {
  hook.onRead = null;
  (await import("@/lib/chain")).clearAdoptFailures();
});

const NAME = "g";
const HUMAN = "1. d4 d5\n";
const PHONE = "1. e4 e5\n";
const MOVES = [
  { ply: 1, san: "e4", frame: 10 },
  { ply: 2, san: "e5", frame: 20 },
];

const params = { params: Promise.resolve({ name: NAME }) };

async function upload(pgn: string, replace = false): Promise<Response> {
  const { POST } = await import("@/app/api/pgn/[name]/route");
  const url = `http://x/api/pgn/${NAME}${replace ? "?replace=1" : ""}`;
  return POST(new Request(url, { method: "POST", body: pgn }), params);
}

async function confirm(): Promise<Response> {
  const { POST } = await import("@/app/api/confirm/[name]/route");
  return POST(new Request(`http://x/api/confirm/${NAME}`, { method: "POST", body: JSON.stringify({ kept: [] }) }), params);
}

async function game(reference: string | null): Promise<string> {
  const root = await tempDataRoot("verdict-rev");
  const dir = await writeSession({ root, name: NAME, moves: MOVES });
  await mkdir(path.join(dir, "files", "games"), { recursive: true });
  await writeFile(path.join(dir, "files", "games", "game.pgn"), PHONE, "utf8");
  if (reference !== null) await writeFile(path.join(dir, "reference.pgn"), reference, "utf8");
  return dir;
}

const candidateOf = async (dir: string) => JSON.parse(await readFile(path.join(dir, "candidate.json"), "utf8"));
const chainState = async () => (await import("@/lib/chain")).chainState(NAME);

// --- 1. adoptPgn gegen einen Upload zwischen Pruefen und Schreiben ---------------------------

test("ein Upload zwischen Pruefung und Uebernahme wird vom Handy-PGN nicht ueberschrieben", async () => {
  const dir = await game(null);
  let landed = false;
  hook.onRead = async (file) => {
    if (landed || !file.endsWith("game.pgn")) return;
    landed = true;
    expect((await upload(HUMAN)).status).toBe(200);
  };

  await (await import("@/lib/chain")).adoptOffered([NAME]);

  expect(landed).toBe(true);
  expect(await readFile(path.join(dir, "reference.pgn"), "utf8")).toBe(HUMAN);
  expect((await import("@/lib/chain")).adoptFailures()).toEqual([expect.stringContaining(NAME)]);
});

test("ohne Zwischenschreiber wird das Handy-PGN weiter uebernommen", async () => {
  const dir = await game(null);
  await (await import("@/lib/chain")).adoptOffered([NAME]);
  expect(await readFile(path.join(dir, "reference.pgn"), "utf8")).toBe(PHONE);
});

// --- 3. Bestaetigung an die Referenz-Revision gebunden ---------------------------------------

test("eine ersetzte Referenz oeffnet confirm wieder — die Bestaetigung selbst bleibt stehen", async () => {
  const dir = await game(PHONE);
  expect((await confirm()).status).toBe(200);
  const before = await candidateOf(dir);
  expect((await chainState()).step).not.toBe("confirm");

  expect((await upload(HUMAN, true)).status).toBe(200);

  const state = await chainState();
  expect(state.step).toBe("confirm");
  expect(state.confirmed).toBe(true);
  expect(state.reason).toMatch(/Referenz/);
  const after = await candidateOf(dir);
  expect(after.confirmed).toBe(true);
  expect(after.reviewed_plies).toEqual(before.reviewed_plies);
});

test("eine Referenz, die NACH einer referenzlosen Bestaetigung kommt, oeffnet confirm ebenfalls", async () => {
  await game(null);
  expect((await confirm()).status).toBe(200);
  expect((await chainState()).step).not.toBe("confirm");
  expect((await upload(HUMAN)).status).toBe(200);
  expect((await chainState()).step).toBe("confirm");
});

test("unveraenderte Referenz: die Sprosse bleibt zu, der Stand ist bekannt", async () => {
  await game(PHONE);
  await confirm();
  const state = await chainState();
  expect(state.step).toBe("export");
  expect(state.confirmRefUnknown).toBeFalsy();
});

test("eine alte Bestaetigung ohne Stempel gilt weiter, meldet aber den unbekannten Referenzstand", async () => {
  const dir = await game(PHONE);
  const doc = await candidateOf(dir);
  await writeFile(path.join(dir, "candidate.json"),
    JSON.stringify({ ...doc, confirmed: true, confirmed_at: "2026-09-01T00:00:00Z", reviewed_plies: [1, 2] }), "utf8");
  const state = await chainState();
  expect(state.step).toBe("export");
  expect(state.confirmRefUnknown).toBe(true);
});

test("ein Stempel, den eine spaetere Bestaetigung ohne Stempel stehen liess, zaehlt als unbekannt", async () => {
  const dir = await game(PHONE);
  await confirm();
  // `realgames.write_confirmation` (CLI) setzt `confirmed_at` neu und laesst fremde Schluessel stehen.
  const doc = await candidateOf(dir);
  await writeFile(path.join(dir, "candidate.json"),
    JSON.stringify({ ...doc, confirmed_at: "2099-01-01T00:00:00Z" }), "utf8");
  await writeFile(path.join(dir, "reference.pgn"), HUMAN, "utf8");
  const state = await chainState();
  expect(state.step).toBe("export");
  expect(state.confirmRefUnknown).toBe(true);
});
