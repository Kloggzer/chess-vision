import { expect, test } from "vitest";
import { readJsonl } from "@/lib/jsonl";

/**
 * PowerShells `Out-File`/`Set-Content` stempeln ein BOM; `chesslab.ioutil.read_jsonl` liest
 * deshalb `utf-8-sig`. Der TS-Zwilling zaehlte die erste Zeile als Beschaedigung MITTENDRIN —
 * und `loadSession`, `loadMatte` und `review-notes` werfen darauf die ganze Datei weg.
 */
test("ein BOM vor der ersten Zeile ist keine kaputte Zeile", () => {
  const text = `﻿${JSON.stringify({ frame: "000100" })}\n${JSON.stringify({ frame: "000101" })}\n`;
  const read = readJsonl(text);
  expect(read.corrupt).toBe(0);
  expect(read.rows.map((r) => r.frame)).toEqual(["000100", "000101"]);
});

/** Derselbe Stempel auf dem Manifest: `tallyLines` schneidet selbst (Ratsche, 57-MB-Strom) und
 *  traegt die Politik damit auch selbst — sonst wirft der ganze Datensatz-Blick auf Zeile 1. */
test("tallyLines vertraegt ein BOM auf der ersten Manifest-Zeile", async () => {
  const { tallyLines } = await import("@/lib/corpus");
  const tally = await tallyLines([
    `﻿${JSON.stringify({ session_id: "rg-a", label: "wP" })}`,
    JSON.stringify({ session_id: "rg-a", label: "empty" }),
  ]);
  expect(tally.rows).toBe(2);
});
