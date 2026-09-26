/** `useless.json` — the human's verdict that a recording is not worth work. A marker, never a
 *  deletion: the undo stamps `undone_at` and both timestamps stay as the record. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomic";
import { BadRequest } from "@/lib/http-error";
import { absentOnly } from "@/lib/measurement";
import { gameDir } from "@/lib/session-store/recordings";
import { serialize } from "@/lib/serialize";

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
  // Ein Fehler beim Nachsehen ist kein Urteil: eine kaputte Datei als "nie geflaggt" liess die Kette anlaufen.
  const text = await readFile(path.join(gameDir(name), FILE), "utf8").catch(absentOnly);
  return text === null ? null : (JSON.parse(text) as UselessFlag);
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

/** Unflagging a game nobody flagged writes nothing; re-flagging an undone one starts a fresh `at`. */
export async function setUseless(
  name: string,
  useless: boolean,
  reason?: string,
): Promise<UselessFlag | null> {
  const file = path.join(gameDir(name), FILE);
  // Riegel um lesen-aendern-schreiben: ein Widerruf gleichzeitig mit dem Setzen sah noch die leere
  // Datei und fiel lautlos aus, mit 200.
  return serialize(file, async () => {
    const current = await readUseless(name);
    let next: UselessFlag | null;
    if (useless) {
      const text = (reason ?? "").trim();
      if (text.length > REASON_MAX) throw new BadRequest(`reason longer than ${REASON_MAX} characters`);
      next = { at: now(), ...(text ? { reason: text } : {}) };
    } else {
      if (!current) return null;
      next = { ...current, undone_at: now() };
    }
    await writeFileAtomic(file, JSON.stringify(next, null, 2) + "\n");
    return next;
  });
}
