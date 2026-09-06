import { expect, test } from "vitest";
import { parseReference } from "./pgn";

const HEAD = '[Event "chesslab"]\n[Result "*"]\n\n';

test("a one-game file is its mainline", () => {
  expect(parseReference(`${HEAD}1. e4 e5 2. Nf3 *\n`)).toEqual({ sans: ["e4", "e5", "Nf3"], problem: null, more: 0 });
});

/** 2026-08-30-16-20-19: the phone wrote the continuation after a seam as a second game. */
test("the first game is the reference, the continuation is counted", () => {
  const text =
    `${HEAD}1. d4 d5 2. e4 *\n\n` +
    '[Event "chesslab"]\n[Result "0-1"]\n[SetUp "1"]\n[FEN "rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2"]\n\n' +
    "2... e5 {position rebuilt by cnn_pair} 3. Nf3 0-1\n";
  expect(parseReference(text)).toEqual({ sans: ["d4", "d5", "e4"], problem: null, more: 1 });
});

/** 2026-08-12-11-19-00: the phone's own record plays d5 twice — unreadable, and it says so. */
test("an illegal mainline is a problem, not a crash", () => {
  const out = parseReference(`${HEAD}1. e4 d5 2. Nc3 Nf6 3. d4 d5 *\n`);
  expect(out.sans).toBeNull();
  expect(out.problem).toMatch(/d5/);
});
