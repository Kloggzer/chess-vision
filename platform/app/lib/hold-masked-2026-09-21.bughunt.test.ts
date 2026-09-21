/**
 * `lastByStep` liess die Zeile IM SPEICHER immer gewinnen — auch wenn der Ledger inzwischen eine
 * neuere Zeile derselben Sprosse trug. `holdExport` schreibt nur in den Ledger, also verdeckte ein
 * abgeschlossener Export von vorhin den Halt: der Picker sah kein `notBefore` und `z` fand nichts.
 */
import { beforeEach, expect, test } from "vitest";
import { enqueueChain, holdExport, lastByStep, releaseExportHold, whenIdle } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

const NAME = "2026-09-21-10-00-00";

beforeEach(async () => {
  await tempDataRoot("hold-mask");
  // Kein echter Lauf: der Spawn scheitert sofort, der Job landet als `failed` im Speicher.
  process.env.CHESSLAB_UV = "chesslab-no-such-binary-2026-09-21.exe";
});

test("ein frueherer Export im Speicher verdeckt den spaeteren Halt nicht", async () => {
  await enqueueChain(NAME, "export");
  await whenIdle();
  expect((await lastByStep()).get(`${NAME}|export`)?.state).toBe("failed");

  const held = await holdExport(NAME, 90_000);

  expect((await lastByStep()).get(`${NAME}|export`)?.notBefore).toBe(held.notBefore);
  expect(await releaseExportHold(NAME)).toMatchObject({ dequeued: true });
});
