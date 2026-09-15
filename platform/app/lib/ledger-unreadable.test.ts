import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { jobHistory, jobOf, jobs } from "@/lib/jobs";
import { ingestToken } from "@/lib/ingest";

let data: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-ledger-"));
  process.env.CHESSLAB_DATA_DIR = data;
  delete process.env.CHESSLAB_INGEST_TOKEN;
});

/**
 * Ein unbedingtes `catch` um die Ledger-Datei rendert JEDEN Lesefehler als leere Historie — die
 * Seite sagt dann "noch nichts gelaufen", wo in Wahrheit die gesamte Fehlerhistorie unlesbar ist.
 * Das ist die Regel des Nutzers invertiert: Scheitern wird als erfolgsfoermige Leere gezeigt.
 */
const unreadableLedger = async () => {
  await mkdir(path.join(data, "inbox", "jobs.jsonl"), { recursive: true });
};

test("jobHistory sagt nicht 'nichts gelaufen', wenn das Ledger unlesbar ist", async () => {
  await unreadableLedger();

  await expect(jobHistory("2026-08-13-19-34-23")).rejects.toThrow();
});

test("jobs() sagt nicht 'nichts gelaufen', wenn das Ledger unlesbar ist", async () => {
  await unreadableLedger();

  await expect(jobs()).rejects.toThrow();
});

test("jobOf() sagt nicht 'nichts gelaufen', wenn das Ledger unlesbar ist", async () => {
  await unreadableLedger();

  await expect(jobOf("2026-08-13-19-34-23")).rejects.toThrow();
});

/**
 * Eine unlesbare Token-Datei praegte bisher still einen NEUEN Token: das Handy haelt dann einen,
 * den der Rechner nicht mehr kennt, bekommt 401, und nirgends steht warum.
 */
test("ingestToken praegt keinen neuen Token, wenn die alte Datei unlesbar ist", async () => {
  await mkdir(path.join(data, "inbox", "token"), { recursive: true });

  await expect(ingestToken()).rejects.toThrow();
});
