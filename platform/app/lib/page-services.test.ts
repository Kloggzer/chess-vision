/** Seiten, deren Logik in Services gezogen wurde (`docs/web-architektur.md`, Runde 3): die Seite
 *  gibt dieselben Props weiter wie vorher. Geschrieben gegen den alten Stand, vor dem Umzug. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidElement, type ReactNode } from "react";
import { expect, test } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const PAGE_TIMEOUT = 30_000;
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MOVES = [
  { ply: 1, san: "e4", frame: 1, fen_after: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" },
  { ply: 2, san: "e5", frame: 2, fen_after: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2" },
];

function propsWith(node: ReactNode, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) node.forEach((n) => propsWith(n, key, out));
  else if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (key in props) out.push(props[key]);
    propsWith(props.children as ReactNode, key, out);
  }
  return out;
}

async function game(root: string, name: string, pgn: string | null, phonePgn = false): Promise<string> {
  const dir = await writeSession({ root, name, moves: MOVES, candidate: { start_fen: START, reviewed_plies: [1] } });
  if (pgn !== null) await writeFile(path.join(dir, "reference.pgn"), pgn, "utf8");
  if (phonePgn && pgn !== null) {
    await mkdir(path.join(dir, "files", "games"), { recursive: true });
    await writeFile(path.join(dir, "files", "games", "a.pgn"), pgn, "utf8");
  }
  await writeFile(path.join(dir, "ui-meta.json"), JSON.stringify({ title: `T ${name}`, archived: true }), "utf8");
  return dir;
}

const cardShape = (cards: unknown) =>
  (cards as { keep: number[]; group: string[]; held: number | null }[]).map(({ keep, group, held }) => ({ keep, group, held }));

test("/ und /game/<name> geben dieselbe GameInfo weiter", async () => {
  const root = await tempDataRoot("ps-game");
  await game(root, "2026-08-13-12-10-55", "1. e4 c5 *\n");
  const home = propsWith(await (await import("@/app/page")).default(), "game");
  const one = propsWith(
    await (await import("@/app/game/[name]/page")).default({ params: Promise.resolve({ name: "2026-08-13-12-10-55" }) }),
    "game",
  );
  expect(home).toHaveLength(1);
  expect(one).toEqual(home);
  expect(home[0]).toMatchObject({
    name: "2026-08-13-12-10-55", sessionId: "rg-2026-08-13-12-10-55", title: "T 2026-08-13-12-10-55",
    archived: true, frames: 0, confirmed: false, plies: 2, reviewed: 1, pgnPlies: 2,
    boards: 0, boardsDone: 0, cells: 0, cellsDone: 0, modelRead: false, lastJob: null,
  });
}, PAGE_TIMEOUT);

// /game/<name> las nur `ui-meta.json`; ein von Python ausgemusterter Lauf stand dort als aktiv.
test("/game/<name>: der Archiv-Stempel der Pipeline zaehlt wie auf /", async () => {
  const root = await tempDataRoot("ps-game-archived");
  const dir = await game(root, "2026-08-13-12-10-55", null);
  await writeFile(path.join(dir, "ui-meta.json"), JSON.stringify({ title: "t" }), "utf8");
  await writeFile(path.join(dir, "session.yaml"), "archived_at: 2026-09-01\n", "utf8");
  const [one] = propsWith(
    await (await import("@/app/game/[name]/page")).default({ params: Promise.resolve({ name: "2026-08-13-12-10-55" }) }),
    "game",
  ) as { archived: boolean }[];
  expect(one.archived).toBe(true);
}, PAGE_TIMEOUT);

test("/confirm/<name>: Karten, Galerie und Stempel aus LCS gegen reference.pgn", async () => {
  const root = await tempDataRoot("ps-confirm");
  await game(root, "g", "1. e4 c5 *\n");
  const page = await (await import("@/app/confirm/[name]/page")).default({ params: Promise.resolve({ name: "g" }) } as never);
  const cards = propsWith(page, "cards")[0] as unknown[];
  const gallery = propsWith(page, "gallery")[0] as unknown[];
  expect(propsWith(page, "referenceMd5")).toEqual([createHash("md5").update("1. e4 c5 *\n").digest("hex")]);
  expect(propsWith(page, "reviewedPlies")).toEqual([[1]]);
  expect(propsWith(page, "text")).toEqual(["1. e4 c5 *\n"]);
  expect(cardShape(cards)).toEqual([{ keep: [1], group: ["e5"], held: null }]);
  expect(cardShape(gallery)).toEqual([{ keep: [0], group: ["e4"], held: 1 }]);
}, PAGE_TIMEOUT);

test("/strom/zuege: ein Handy-PGN beweist nichts, jede andere Referenz schneidet per LCS", async () => {
  const root = await tempDataRoot("ps-zuege");
  await game(root, "2026-08-13-12-10-55", "1. e4 c5 *\n");
  await game(root, "2026-08-14-12-10-55", "1. e4 e5 *\n", true);
  for (const name of ["2026-08-13-12-10-55", "2026-08-14-12-10-55"]) {
    await writeFile(path.join(root, "recordings", name, "ui-meta.json"), JSON.stringify({ title: name }), "utf8");
  }
  const page = await (await import("@/app/strom/zuege/page")).default();
  const [games] = propsWith(page, "games") as { name: string; reference: string; cards: unknown[]; gallery: unknown[]; noted: number[]; sessionId: string; plies: number; referenceProblem: string | null; title: string | null }[][];
  expect(games.map((g) => [g.name, g.reference, g.cards.length, g.gallery.length, g.plies, g.sessionId, g.title, g.referenceProblem, g.noted]))
    .toEqual([
      ["2026-08-14-12-10-55", "phone", 2, 0, 2, "rg-2026-08-14-12-10-55", "2026-08-14-12-10-55", null, []],
      ["2026-08-13-12-10-55", "outside", 1, 1, 2, "rg-2026-08-13-12-10-55", "2026-08-13-12-10-55", null, []],
    ]);
  expect(games.map((g) => [cardShape(g.cards).map((c) => c.group), cardShape(g.gallery).map((c) => c.group)])).toEqual([
    [[["e4"], ["e5"]], []],
    [[["e5"]], [["e4"]]],
  ]);
}, PAGE_TIMEOUT);
