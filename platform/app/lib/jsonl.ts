/**
 * Der eine Leser fuer `.jsonl` — und die eine Antwort auf die halb geschriebene Zeile: der
 * ZEILENUMBRUCH entscheidet. Drei Leser derselben Datei antworteten bis 2026-09-16 verschieden.
 */
export type JsonlRead = {
  rows: Record<string, unknown>[];
  /** Die letzte Zeile war unvollstaendig. Erwartbar, kein Defekt. */
  tail: boolean;
  /** Kaputte Zeilen, die NICHT die letzte waren. Die kann kein Schreiber erklaeren. */
  corrupt: number;
};

/**
 * `utf-8-sig` wie `chesslab.ioutil`: PowerShells `Out-File` stempelt ein BOM, und ohne dies zaehlt
 * Zeile 1 als beschaedigt — die Leser werfen darauf die ganze Datei weg. Nur das FUEHRENDE
 * Zeichen: ein U+FEFF mitten im Inhalt ist Inhalt und bleibt stehen.
 */
export function stripBom(text: string): string {
  return text.startsWith("﻿") ? text.slice(1) : text;
}

export function readJsonl(text: string): JsonlRead {
  const lines = stripBom(text).split(/\r?\n/);
  // Der ZEILENUMBRUCH entscheidet: wer mitten in einer Zeile steht, hat ihn noch nicht
  // geschrieben. Eine kaputte Zeile, die auf einen Umbruch endet, ist kein laufender Schreiber.
  const open = lines.length > 0 && lines[lines.length - 1] !== "";
  const rows: Record<string, unknown>[] = [];
  let tail = false;
  let corrupt = 0;
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as unknown;
      if (obj && typeof obj === "object" && !Array.isArray(obj)) rows.push(obj as Record<string, unknown>);
    } catch {
      if (open && i === lines.length - 1) tail = true;
      else corrupt += 1;
    }
  }
  return { rows, tail, corrupt };
}

/**
 * Die Zeilen, und die kaputte MITTENDRIN als FEHLER. Kein Schreiber kann sie erklaeren, und still
 * uebersprungen wird aus einer Messung eine mit weniger Treffern, aus einem Ledger eins mit
 * weniger Urteilen — von aussen nicht zu unterscheiden. Der halbe SCHWANZ faellt weiter weg.
 */
export function jsonlRowsStrict(where: string, text: string): Record<string, unknown>[] {
  const read = readJsonl(text);
  if (read.corrupt > 0) throw new Error(`${where}: ${read.corrupt} beschaedigte Zeile(n)`);
  return read.rows;
}

/** Nur die Zeilen, die Diagnose weg. NICHT fuer Mess- und Urteilspfade — `platform/app/
 *  measurement-doors.txt` haelt fest, wer das noch tut, und die Liste darf nur schrumpfen. */
export function jsonlRows(text: string): Record<string, unknown>[] {
  return readJsonl(text).rows;
}
