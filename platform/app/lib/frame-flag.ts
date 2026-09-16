/**
 * Das `unusable`-Flag auf einer `log.jsonl`-Zeile, wie `chesslab session flag --unusable`, nur aus
 * dem Browser. Sicherung, dann tmp+rename wie `sessions._write_log`: `data/` ist unwiederbringlich.
 */
import { constants } from "node:fs";
import { copyFile, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkName } from "@/lib/data";
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
  const text = await readFile(file, "utf8");
  // TODO(1): Der ZEILENUMBRUCH entscheidet (`lib/jsonl.ts`). Endet die Datei mitten in einer Zeile,
  // stroemt der Export gerade hinein; der Treffer steht meist davor, die Schleife brach ab, und das
  // Zurueckschreiben setzte ein "\n" hinter die halbe Zeile — aus `tail` wurde dauerhaft `corrupt`.
  if (text !== "" && !text.endsWith("\n")) throw new Error(`${name}/log.jsonl endet mitten in einer Zeile`);
  const lines = text.split("\n");
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
  const body = lines.filter((l) => l.trim()).join("\n") + "\n";
  await writeFile(`${file}.tmp`, body, "utf8");
  await rename(`${file}.tmp`, file);
  return { stem, unusable, backup };
}
