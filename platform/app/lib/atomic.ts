/** `writeFile` kuerzt zuerst, die Datei ist bis zum letzten Byte halb da — daher tmp+rename. */
import { createHash } from "node:crypto";
import { appendFile, readFile, rename, rm, writeFile } from "node:fs/promises";
import { absentOnly } from "@/lib/measurement";
import { serialize } from "@/lib/serialize";

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

export type Stamp = string | null;

/** Groesse und Inhalts-Hash; `null` nur, wenn die Datei FEHLT. Mtime taugt nicht: zwei gleich
 *  lange Schreiber im selben Takt tragen dieselbe, auch in ns. */
export async function stampOf(file: string): Promise<Stamp> {
  const data = await readFile(file).catch(absentOnly);
  return data === null ? null : `${data.length}:${createHash("sha256").update(data).digest("hex")}`;
}

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
    // Der Riegel gehoert HIERHER: Lesen, Kuerzen, Anhaengen sind drei Schritte (auf Windows scheiterte
    // der zweite Schreiber sonst mit EPERM am `rename`). `serialize` ist NICHT wiedereintrittsfaehig —
    // wer aussen auf denselben Pfad riegelt, verklemmt sich.
  return serialize(file, async () => {
    // Nur ENOENT ist der leere Vorzustand: ein EBUSY als "" klebte die Zeile an den halben Schwanz.
    const text = (await readFile(file, "utf8").catch(absentOnly)) ?? "";
    if (text !== "" && !text.endsWith("\n")) {
      // Ein blankes `\r` am Ende ist ein zwischen CR und LF erschlagener Schreiber: die ZEILE ist
      // ganz und `readJsonl` nimmt sie, also bekommt sie ihren Umbruch statt weggeworfen zu werden
      // (wie `ioutil.append_rows`). Alles andere ist eine halbe Zeile und faellt weg.
      const whole = text.endsWith("\r")
        ? `${text.slice(0, -1)}\n`
        : text.slice(0, text.lastIndexOf("\n") + 1);
      await writeFileAtomic(file, whole);
    }
    await appendFile(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
    return rows.length;
  });
}
