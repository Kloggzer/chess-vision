import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { matteCensus } from "@/lib/matte";
import { tempDataRoot, writeLog } from "@/lib/test-fixtures";

/**
 * Eine Meldung auf einen Frame, den dieser Export nicht mehr fuehrt, ist keine offene Arbeit:
 * gemessen 2026-09-15 hingen 14 Aufnahmen so, auf `2026-08-15-23-01-43` alle 34 Meldungen.
 */
let dir: string;
let rec: string;

beforeEach(async () => {
  dir = await tempDataRoot("reported-orphan");
  rec = path.join(dir, "recordings", "g");
  await mkdir(rec, { recursive: true });
  await mkdir(path.join(dir, "labels"), { recursive: true });
});

async function reviews(...stems: string[]) {
  await writeFile(path.join(dir, "labels", "review-notes.jsonl"),
    stems.map((s) => JSON.stringify({ session_id: "rg-g", frame: s, verdict: "dirty-frame" })).join("\n") + "\n",
    "utf8");
}

test("eine Meldung ohne Frame im Export haelt die Sprosse nicht offen", async () => {
  await writeLog(rec, [{ frame: 2, dirty: true, extra: { dirty_reason: "occluded" } }]);
  await reviews("009999");

  const census = await matteCensus("g");

  expect(census.reportedOrphan, "die Meldung zeigt auf keinen Frame dieses Exports").toBe(1);
  expect(census.reportedOpen, "BUG: unerreichbare Arbeit haelt die Matte-Sprosse ewig offen").toBe(0);
  expect(census.reported, "sichtbar bleibt sie trotzdem").toBe(1);
});

test("eine Meldung auf einen Frame, den es gibt, bleibt offene Arbeit", async () => {
  await writeLog(rec, [{ frame: 2, dirty: true, extra: { dirty_reason: "occluded" } }]);
  await reviews("000002");

  const census = await matteCensus("g");

  expect(census.reportedOrphan).toBe(0);
  expect(census.reportedOpen).toBe(1);
});

test("auch ein `changed`-Frame zaehlt als vorhanden — der Stapel ist nicht der Export", async () => {
  // `pile` sind nur die `occluded`-Zeilen; dagegen geprueft waere jede `changed`-Meldung eine Waise.
  await writeLog(rec, [{ frame: 4, dirty: true, extra: { dirty_reason: "changed" } }]);
  await reviews("000004");

  const census = await matteCensus("g");

  expect(census.reportedOrphan).toBe(0);
  expect(census.reportedOpen).toBe(1);
});

// Eine `skipped`-Zeile ist kein Alpha: das Frame bleibt gemeldet, haelt die Kette aber nicht auf.
test("a frame SAM already refused is reported but no longer open", async () => {
  await writeLog(rec, [{ frame: 2, dirty: true, extra: { dirty_reason: "stale" } }]);
  await writeFile(path.join(rec, "matte.jsonl"),
    JSON.stringify({ frame: "000002", skipped: "board unreadable" }) + "\n", "utf8");
  await reviews("000002");

  const census = await matteCensus("g");
  expect(census.reported, "sichtbar bleibt es").toBe(1);
  expect(census.reportedOpen, "BUG: SAM hat geantwortet, die Kette wartet trotzdem weiter").toBe(0);
});

// Nur `board` macht einen Frame zum Export: die Handy-Zeile traegt `frame`, aber kein Brett zum Schneiden.
test("eine Log-Zeile ohne Brett ist kein exportierter Frame", async () => {
  await writeFile(path.join(rec, "log.jsonl"), JSON.stringify({ frame: "frames/000002.png", dirty: true }) + "\n", "utf8");
  await reviews("000002");

  const census = await matteCensus("g");
  expect(census.reportedOrphan).toBe(1);
  expect(census.reportedOpen).toBe(0);
});
