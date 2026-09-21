/**
 * Das `unusable`-Flag auf einer `log.jsonl`-Zeile, wie `chesslab session flag --unusable`, nur aus
 * dem Browser. Sicherung, dann tmp+rename wie `sessions._write_log`: `data/` ist unwiederbringlich.
 */
import { constants } from "node:fs";
import { copyFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomic";
import { checkName } from "@/lib/data";
import { stripBom } from "@/lib/jsonl";
import { serialize } from "@/lib/serialize";
import { sessionDir } from "@/lib/session";

export type FrameFlag = { stem: string; unusable: boolean; backup: string | null };

const stemOf = (value: string): string => path.basename(value).replace(/\.[^.]+$/, "");

function backupName(stamp: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `log.jsonl.bak.${stamp.getFullYear()}${p(stamp.getMonth() + 1)}${p(stamp.getDate())}-` +
    `${p(stamp.getHours())}${p(stamp.getMinutes())}${p(stamp.getSeconds())}`;
}

/** Setzt oder loescht `unusable` auf der Zeile mit diesem Stem. Steht es schon so, wird NICHTS
 *  geschrieben: sonst kostet jeder zweite Druck eine Sicherung und kippt jeden mtime-Cache. */
export async function flagFrame(name: string, stem: string, unusable: boolean): Promise<FrameFlag> {
  checkName(stem, "frame");
  const file = path.join(sessionDir(name), "log.jsonl");
  // Riegel um lesen-aendern-schreiben auf der GANZEN Datei: zwei Urteile kurz hintereinander lasen
  // denselben Text, das erste Flag war nach dem zweiten Schreiben weg — und die Suche nach einem
  // freien Sicherungsnamen lief in dasselbe Fenster und starb mit EEXIST.
  return serialize(file, () => flagUnlocked(name, stem, unusable, file));
}

async function flagUnlocked(
  name: string, stem: string, unusable: boolean, file: string,
): Promise<FrameFlag> {
  const text = await readFile(file, "utf8");
  // Der ZEILENUMBRUCH entscheidet (`lib/jsonl.ts`): endet die Datei mittendrin, stroemt der Export
  // gerade hinein, und das Zurueckschreiben haengte seinen Umbruch hinter die halbe Zeile — aus
  // einem erwartbaren Schwanz wurde dauerhafte Beschaedigung.
  if (text !== "" && !text.endsWith("\n")) throw new Error(`${name}/log.jsonl endet mitten in einer Zeile`);
  // Ohne `stripBom` warf Zeile 1 hier, und das Flag war auf einer PowerShell-geschriebenen
  // log.jsonl gar nicht setzbar. Zurueckgeschrieben wird dann ohne BOM — wie Python es liest.
  const lines = stripBom(text).split("\n");
  let hit = -1;
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { frame?: string; board?: string; unusable?: boolean };
    if (stemOf(row.board ?? row.frame ?? "") !== stem) continue;
    hit = i;
    if ((row.unusable === true) === unusable) return { stem, unusable, backup: null };
    lines[i] = JSON.stringify({ ...row, unusable });
    break;
  }
  if (hit === -1) throw new Error(`no frame ${stem} in ${name}/log.jsonl`);
  // Nie ueber eine vorhandene Sicherung: zwei Urteile in derselben Sekunde sind ein Klick
  // auseinander, und `sessions.backup_log` haelt es aus demselben Grund so.
  const base = backupName(new Date());
  let backup = base;
  for (let n = 1; n <= 99; n++) {
    const taken = await stat(path.join(sessionDir(name), backup)).then(() => true, () => false);
    if (!taken) break;
    backup = `${base}-${n}`;
  }
  await copyFile(file, path.join(sessionDir(name), backup), constants.COPYFILE_EXCL);
  await writeFileAtomic(file, lines.filter((l) => l.trim()).join("\n") + "\n");
  return { stem, unusable, backup };
}
