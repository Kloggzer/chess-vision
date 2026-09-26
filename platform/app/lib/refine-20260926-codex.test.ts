import { mkdir, rm, writeFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { errorStatus, NotFound, respond } from "@/lib/http-error";
import { heavyLockPath, releaseAfter } from "@/lib/chain/heavy-lock";
import { inboxDir } from "@/lib/ingest/ingest";
import { tempDataRoot } from "@/lib/test-fixtures";

test("respond reicht eine fertige Stream-Antwort samt Headern unveraendert durch", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("strom"));
      controller.close();
    },
  });
  const original = new Response(body, {
    status: 206,
    headers: { "content-type": "text/plain", "cache-control": "no-store", "x-review": "kept" },
  });

  const result = await respond(() => original);

  expect(result).toBe(original);
  expect(result.status).toBe(206);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(result.headers.get("x-review")).toBe("kept");
  expect(await result.text()).toBe("strom");
});

test("releaseAfter wirft nach erfolgreicher Freigabe exakt den Originalfehler", async () => {
  await tempDataRoot("refine-release-after");
  await mkdir(inboxDir(), { recursive: true });
  await writeFile(heavyLockPath(), JSON.stringify({
    pid: process.pid, job: "test", name: "g", startedAt: new Date().toISOString(),
  }));
  const original = new NotFound("weg");

  let caught: unknown;
  try {
    await releaseAfter(original);
  } catch (error) {
    caught = error;
  }

  expect(caught).toBe(original);
  expect(errorStatus(caught)).toBe(404);
  await expect(rm(heavyLockPath())).rejects.toMatchObject({ code: "ENOENT" });
});
