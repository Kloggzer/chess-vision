import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { POST as drainPost } from "@/app/api/drain/route";
import { setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const press = (step: string) => drainPost(new Request("http://x/api/drain", { method: "POST", body: JSON.stringify({ step }) }));

afterEach(async () => {
  await stopPyWorker();
  setPyWorkerCommand(null);
});

test("drain POST: ein nicht startbarer Worker ist 500, kein Konflikt", async () => {
  const root = await tempDataRoot("qa-offen-drain-down");
  await writeSession({ root, name: "g" });
  await stopPyWorker();
  setPyWorkerCommand({ command: path.join(root, "gibt-es-nicht.exe"), args: [] });

  const res = await press("export");

  expect(res.status, "BUG: startDrain macht PyWorkerDown zur 409").toBe(500);
  expect((await res.json()).error).toMatch(/nicht startbar/);
});

test("drain POST: nichts wartet bleibt 409", async () => {
  await tempDataRoot("qa-offen-drain-empty");
  const res = await press("label");
  expect(res.status).toBe(409);
});
