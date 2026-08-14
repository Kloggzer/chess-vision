/**
 * `data/realgames/<name>/useless.json` — the human's verdict that a recording is not worth work.
 *
 * A marker beside `candidate.json`, never a deletion: the repo rule is park, don't delete, so the
 * undo stamps `undone_at` instead of removing the file and the two timestamps stay as the record
 * of what was judged when. Nothing on the Python side reads this; it only silences the chain.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gameDir } from "@/lib/data";

export type UselessFlag = {
  at: string;
  reason?: string;
  /** Set by "doch brauchbar" — the flag is history from then on, and the chain runs again. */
  undone_at?: string;
};

const FILE = "useless.json";
const REASON_MAX = 200;

/** ISO to the second — the same shape `writeConfirmation` stamps into `candidate.json`. */
const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

/** The record on disk, undone ones included — null when nobody ever flagged this game. */
export async function readUseless(name: string): Promise<UselessFlag | null> {
  try {
    return JSON.parse(await readFile(path.join(gameDir(name), FILE), "utf8")) as UselessFlag;
  } catch {
    return null;
  }
}

/** The flag as the UI means it: set, and not taken back. */
export function isUseless(flag: UselessFlag | null): boolean {
  return flag !== null && !flag.undone_at;
}

/** The ACTIVE flag, which is what every caller but the undo cares about. */
export async function uselessFlag(name: string): Promise<UselessFlag | null> {
  const flag = await readUseless(name);
  return isUseless(flag) ? flag : null;
}

/**
 * Flag or unflag, and return what the file now holds.
 *
 * Unflagging a game nobody flagged writes nothing (there is no history to keep), and re-flagging
 * an undone one starts a fresh `at` rather than resurrecting the old verdict.
 */
export async function setUseless(
  name: string,
  useless: boolean,
  reason?: string,
): Promise<UselessFlag | null> {
  const current = await readUseless(name);
  let next: UselessFlag | null;
  if (useless) {
    const text = (reason ?? "").trim();
    if (text.length > REASON_MAX) throw new Error(`reason longer than ${REASON_MAX} characters`);
    next = { at: now(), ...(text ? { reason: text } : {}) };
  } else {
    if (!current) return null;
    next = { ...current, undone_at: now() };
  }
  await writeFile(path.join(gameDir(name), FILE), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}
