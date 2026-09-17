/**
 * Schreiben ueber eine Zwischenstufe: `writeFile` kuerzt zuerst, also ist die Datei zwischen
 * Kuerzen und letztem Byte halb da. `writeConfirmation` und `flagFrame` gehen aus diesem Grund
 * seit je ueber tmp+rename; dies ist dieselbe Bewegung als eine Funktion.
 */
import { appendFile, readFile, rename, rm, stat, writeFile } from "node:fs/promises";

/** Eigene Zwischendatei je Schreibvorgang: unter EINEM `${file}.tmp` raeumte der `catch` des
 *  Abbrechers die halb geschriebene Datei eines anderen weg, und der verlor sein `rename` mit
 *  ENOENT — auch dann, wenn er den Riegel hielt. */
let tmpSeq = 0;
const tmpFor = (file: string) => `${file}.${process.pid}-${tmpSeq++}.tmp`;

export async function writeFileAtomic(file: string, body: string | Uint8Array): Promise<void> {
  const tmp = tmpFor(file);
  try {
    await writeFile(tmp, body, "utf8");
    await rename(tmp, file);
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}

/** Mtime und Groesse — die Form, auf die `lib/session.ts` und `lib/corrections.ts` schon cachen. */
export type Stamp = string | null;

export const stampOf = (file: string): Promise<Stamp> =>
  stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => null);

/** Jemand anders hat die Datei geschrieben, waehrend wir sie geaendert haben. */
export class Contested extends Error {}

/**
 * Nur schreiben, solange die Datei die ist, an der die Arbeit begann — zweimal geprueft, davor und
 * unmittelbar vor dem Umhaengen, weil das Serialisieren selbst ein Fenster ist.
 */
export async function writeFileAtomicGuarded(
  file: string, body: string, stamp: Stamp, what: string,
): Promise<void> {
  const tmp = tmpFor(file);
  try {
    if ((await stampOf(file)) !== stamp) throw new Contested(what);
    await writeFile(tmp, body, "utf8");
    if ((await stampOf(file)) !== stamp) throw new Contested(what);
    await rename(tmp, file);
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}

/**
 * Zeilen anhaengen — und vorher einen abgerissenen Schwanz abschneiden. Ohne Umbruch am Ende steht
 * dort eine halbe Zeile; wer blind anhaengt, klebt seine daran und macht aus dem tolerierten Rest
 * echte Beschaedigung MITTENDRIN, auf die `readJsonl` danach bei jedem Lesen wirft.
 */
export async function appendRows(file: string, rows: unknown[]): Promise<number> {
  if (rows.length === 0) return 0;
  const text = await readFile(file, "utf8").catch(() => "");
  if (text !== "" && !text.endsWith("\n")) {
    await writeFileAtomic(file, text.slice(0, text.lastIndexOf("\n") + 1));
  }
  await appendFile(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return rows.length;
}
