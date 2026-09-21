/**
 * Wessen Leiche eine `running`-Zeile ist, entscheidet die PID — nicht "steht sie in meiner
 * Warteschlange". Ein zweiter Server machte sonst aus jedem fremden Lauf eine Leiche und bot
 * den Startknopf an, waehrend der erste mitten im Replay steckte.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { inboxDir } from "@/lib/ingest";
import { jobOf, type Job } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

/** Eine PID, die es sicher nicht gibt: die hoechste ist unter 2^22, und 0 ist kein Prozess. */
const DEAD = 4_194_303;

async function ledger(rows: Partial<Job>[]): Promise<void> {
  await mkdir(inboxDir(), { recursive: true });
  const text = rows.map((row) => JSON.stringify({ state: "running", queuedAt: "2026-09-21T06:00:00Z", ...row }));
  await writeFile(path.join(inboxDir(), "jobs.jsonl"), text.join("\n") + "\n", "utf8");
}

beforeEach(async () => {
  await tempDataRoot("job-restart");
});

test("ein fremder Server, der noch lebt, hat keine Leiche hinterlassen", async () => {
  await ledger([{ name: "a", kind: "matte", pid: process.pid + 0 }]);
  // Dieselbe PID wie wir, aber kein Job im Speicher: die alte Regel, und sie gilt weiter.
  expect((await jobOf("a"))?.state).toBe("failed");

  await ledger([{ name: "b", kind: "matte", pid: DEAD, childPid: process.pid }]);
  expect((await jobOf("b"))?.state).toBe("running");
});

test("ein toter fremder Server ist eine Leiche, ein lebender nicht", async () => {
  await ledger([{ name: "c", kind: "matte", pid: DEAD }]);
  expect((await jobOf("c"))?.state).toBe("failed");
  expect((await jobOf("c"))?.reason).toContain("server restarted");

  // Ein LEBENDER fremder Server: der Knopf gehoert gesperrt, nicht angeboten.
  await ledger([{ name: "d", kind: "matte", pid: process.ppid }]);
  expect((await jobOf("d"))?.state).toBe("running");
});
