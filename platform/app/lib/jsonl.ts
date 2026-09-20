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

export function readJsonl(text: string): JsonlRead {
  // `utf-8-sig` wie `chesslab.ioutil`: PowerShells `Out-File` stempelt ein BOM, und ohne diese
  // Zeile war die erste Zeile "beschaedigt MITTENDRIN" — die Leser werfen darauf die ganze Datei weg.
  const lines = (text.startsWith("﻿") ? text.slice(1) : text).split(/\r?\n/);
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

/** Nur die Zeilen — fuer Leser, die eine kaputte Zeile ohnehin nur ueberspringen wuerden. */
export function jsonlRows(text: string): Record<string, unknown>[] {
  return readJsonl(text).rows;
}
