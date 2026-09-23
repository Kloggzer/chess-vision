import { constants } from "node:fs";
import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";
import { stampOf, writeFileAtomicGuarded } from "@/lib/atomic";
import { exists, stampOrMissing } from "@/lib/measurement";
import { gameDir, readReferenceBytes, referenceDigest, referencePath } from "@/lib/session-store/recordings";

/** Liegt eine `reference.pgn`? Nur ENOENT heisst nein — ein EACCES wirft. */
export const hasReferenceFile = (name: string): Promise<boolean> => exists(referencePath(name));

/** Das Handy-PGN als `reference.pgn`, EXKLUSIV: `false`, wenn inzwischen eine liegt — zwischen
 *  Pruefung und Schreiben kann ein Upload landen, und ein Mensch war dann schneller. */
export async function writeReferenceOnce(name: string, text: string): Promise<boolean> {
  try {
    await writeFile(referencePath(name), text, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (e) {
    if ((e as { code?: string })?.code !== "EEXIST") throw e;
    return false;
  }
}

/** Verweigert, bevor etwas landet — die Route antwortet darauf mit 409. */
export class ReferenceRefused extends Error {}

function backupName(stamp: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `reference.pgn.bak.${stamp.getFullYear()}${p(stamp.getMonth() + 1)}${p(stamp.getDate())}-` +
    `${p(stamp.getHours())}${p(stamp.getMinutes())}${p(stamp.getSeconds())}`;
}

/** Sicherung wie `lib/session-store/frame-flag.ts`: nie ueber eine vorhandene: zwei Ersetzungen in derselben
 *  Sekunde sind einen Klick auseinander, und die ueberschriebene ist die einzige menschliche. */
async function keepCopy(file: string): Promise<string> {
  const base = backupName(new Date());
  let name = base;
  for (let n = 1; n <= 99; n++) {
    const taken = (await stampOrMissing(path.join(path.dirname(file), name))) !== null;
    if (!taken) break;
    name = `${base}-${n}`;
  }
  await copyFile(file, path.join(path.dirname(file), name), constants.COPYFILE_EXCL);
  return name;
}

/** Ein Schreiber je Datei. Zwei Tabs haben sonst beide die Pruefung bestanden und der letzte
 *  gewinnt lautlos — das Urteil des anderen waere weg, ohne dass ihm jemand widersprochen hat. */
const writing = new Set<string>();

export type SavedReference = { plies: number; replaced: boolean; backup: string | null };

/**
 * `reference.pgn` ablegen — die Wahrheit, gegen die der Confirm-View urteilt. Geprueft VOR dem
 * Landen, ersetzt nur mit `replace`, gesichert, per tmp+rename unter Stempel-Riegel.
 */
export async function saveReference(name: string, text: string, replace: boolean): Promise<SavedReference> {
  const file = referencePath(name);
  if (writing.has(file)) throw new ReferenceRefused("reference.pgn is being replaced right now");
  writing.add(file);
  try {
    const chess = new Chess();
    chess.loadPgn(text);
    const plies = chess.history().length;
    if (plies === 0) throw new Error("the PGN holds no moves");

    const before = await stampOf(file);
    if (before !== null && !replace) throw new ReferenceRefused("reference.pgn exists — replace must be explicit");
    const backup = before === null ? null : await keepCopy(file);
    // Revisionswaechter: der Set oben sieht nur Schreiber DIESES Prozesses, ein Terminal daneben
    // nicht. Was sich seit der Pruefung bewegt hat, wird nicht ueberrannt.
    await writeFileAtomicGuarded(file, text.endsWith("\n") ? text : text + "\n", before,
      "reference.pgn changed under this write");
    return { plies, replaced: before !== null, backup };
  } finally {
    writing.delete(file);
  }
}

/** `phone` = the reference IS the phone's own move list, so confirming is a self-check. */
export type ReferenceOrigin = "none" | "phone" | "outside";

/** Where `reference.pgn` came from, by digest against every `files/games/*.pgn` — the same test
 *  `realgames.reference_is_the_phones_own` makes, because `chesslab realgames confirm --yes`
 *  REFUSES on `phone` and a screen that drew the line elsewhere would wave through what it blocks. */
export async function referenceOrigin(name: string): Promise<ReferenceOrigin> {
  const dir = gameDir(name);
  // Nur ENOENT ist "none": ein EACCES liess sonst das Handy-PGN als menschliche Referenz durch.
  const bytes = await readReferenceBytes(name);
  if (bytes === null) return "none";
  const digest = referenceDigest(bytes);
  const games = path.join(dir, "files", "games");
  let pgns: string[] = [];
  try {
    pgns = (await readdir(games)).filter((f) => f.endsWith(".pgn"));
  } catch (e) {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
    return "outside"; // no bundle to have written it
  }
  for (const file of pgns) {
    if (referenceDigest(await readFile(path.join(games, file))) === digest) return "phone";
  }
  return "outside";
}
