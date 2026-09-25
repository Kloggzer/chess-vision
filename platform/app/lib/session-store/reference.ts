import { constants } from "node:fs";
import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Contested, stampOf, writeFileAtomicGuarded } from "@/lib/atomic";
import { BadRequest } from "@/lib/http-error";
import { exists, stampOrMissing } from "@/lib/measurement";
import { parseReference } from "@/lib/py/ops";
import { pyCall } from "@/lib/py/worker";
import { checkName, dataDir, referencePath } from "@/lib/session-store/recordings";

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
export class ReferenceRefused extends Contested {}

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
    const { sans, problem } = await parseReference(text);
    if (sans === null) throw new BadRequest(problem ?? "the PGN cannot be read");
    const plies = sans.length;
    if (plies === 0) throw new BadRequest("the PGN holds no moves");

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

/** Where `reference.pgn` came from — `recording.reference_origin`, the test `chesslab realgames
 *  confirm --yes` refuses on, so a screen cannot draw the line elsewhere. Only a MISSING file or
 *  folder is an answer there; an unreadable one fails the call. */
export async function referenceOrigin(name: string): Promise<ReferenceOrigin> {
  return pyCall<ReferenceOrigin>("reference_origin", { root: dataDir(), name: checkName(name, "game name") });
}
