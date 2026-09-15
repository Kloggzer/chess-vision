import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { tempDataRoot, writeLog } from "@/lib/test-fixtures";

/**
 * Eine Meldung auf einen Frame, den dieser Export gar nicht mehr fuehrt, ist keine offene Arbeit.
 *
 * Der Export waehlt ~8 Frames je Stellung; ein Re-Export waehlt andere. Ein Urteil aus der
 * Label-Lane zeigt danach ins Leere — es gibt kein Brett zu schneiden. `reportedOpen` rechnete
 * aber nur die von SAM ABGELEHNTEN heraus, also hielt jede solche Meldung die Matte-Sprosse fuer
 * immer offen. Gemessen 2026-09-15: 14 Aufnahmen haengen so, auf `2026-08-15-23-01-43` zeigen
 * ALLE 34 Meldungen ins Leere.
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

  const { matteCensus } = await import("@/lib/matte");
  const census = await matteCensus("g");

  expect(census.reportedOrphan, "die Meldung zeigt auf keinen Frame dieses Exports").toBe(1);
  expect(census.reportedOpen, "BUG: unerreichbare Arbeit haelt die Matte-Sprosse ewig offen").toBe(0);
  expect(census.reported, "sichtbar bleibt sie trotzdem").toBe(1);
});

test("eine Meldung auf einen Frame, den es gibt, bleibt offene Arbeit", async () => {
  await writeLog(rec, [{ frame: 2, dirty: true, extra: { dirty_reason: "occluded" } }]);
  await reviews("000002");

  const { matteCensus } = await import("@/lib/matte");
  const census = await matteCensus("g");

  expect(census.reportedOrphan).toBe(0);
  expect(census.reportedOpen).toBe(1);
});

test("auch ein `changed`-Frame zaehlt als vorhanden — der Stapel ist nicht der Export", async () => {
  // `pile` sind nur die `occluded`-Zeilen. Wer dagegen pruefte, erklaerte jede Meldung auf einem
  // `changed`/`stale`-Frame faelschlich zur Waise.
  await writeLog(rec, [{ frame: 4, dirty: true, extra: { dirty_reason: "changed" } }]);
  await reviews("000004");

  const { matteCensus } = await import("@/lib/matte");
  const census = await matteCensus("g");

  expect(census.reportedOrphan).toBe(0);
  expect(census.reportedOpen).toBe(1);
});
