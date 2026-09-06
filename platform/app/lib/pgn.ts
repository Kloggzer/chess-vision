import { Chess } from "chess.js";

export type Reference = {
  /** The first game's mainline, or null when it cannot be read. */
  sans: string[] | null;
  /** Why `sans` is null — chess.js' own words, without the parser noise. */
  problem: string | null;
  /** Games in the file beyond the first: the phone writes a continuation after every seam. */
  more: number;
};

/** A game ends where a blank line is followed by a tag pair — the only place `[` opens a line. */
const games = (text: string) => text.replace(/^﻿/, "").split(/\r?\n\s*\r?\n(?=\[)/);

/**
 * The phone's PGN carries one game PER SEGMENT (`[SetUp "1"][FEN ...]` after a resync), and
 * chess.js reads exactly one — so `loadPgn` on the whole file threw on five recordings
 * (2026-09-06). The candidate covers the first segment only, so the first game is the reference.
 */
export function parseReference(text: string): Reference {
  const [first, ...rest] = games(text);
  try {
    const chess = new Chess();
    chess.loadPgn(first);
    return { sans: chess.history(), problem: null, more: rest.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sans: null, problem: message.split("\n")[0], more: rest.length };
  }
}
