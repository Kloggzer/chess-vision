/**
 * Ein gescheiterter Spawn feuert `error` UND danach `close`. Beide Zweige schlossen das Log, das
 * zweite `end` schrieb in einen geschlossenen Strom, und dessen `error` hatte niemand — ein
 * `uncaughtException` auf genau dem Weg, der "uv nicht auf PATH" melden soll.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { enqueueChain, jobsDir, lastByStep, whenIdle } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

const NAME = "2026-09-21-11-00-00";

beforeEach(async () => {
  await tempDataRoot("log-sink");
  process.env.CHESSLAB_UV = "chesslab-no-such-binary-2026-09-21.exe";
});

test("ein Werkzeug, das gar nicht startet, reisst den Server nicht mit", async () => {
  const seen: unknown[] = [];
  const catcher = (error: unknown) => seen.push(error);
  process.on("uncaughtException", catcher);
  try {
    await enqueueChain(NAME, "export");
    await whenIdle();
    await new Promise((resolve) => setTimeout(resolve, 50));
  } finally {
    process.off("uncaughtException", catcher);
  }

  expect(seen).toEqual([]);
  const row = (await lastByStep()).get(`${NAME}|export`);
  expect(row?.state).toBe("failed");
  expect(row?.reason).toContain("CHESSLAB_UV");
  expect(await readFile(path.join(jobsDir(), `${NAME}.export.log`), "utf8")).toContain("spawn failed");
});
