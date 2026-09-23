/**
 * `unusable` ueber `/api/frame-verdict` gegen einen fremden Schreiber der `log.jsonl` (Export,
 * Trim — Python bewacht seine Seite seit 2026-09-23 mit `write_rows_guarded`). Ohne Riegel
 * ueberbuegelte das Urteil den Export oder umgekehrt, und beide meldeten Erfolg.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { type RowSpec, sessionRow, tempDataRoot, writeSession } from "@/lib/test-fixtures";

type Hook = { onRead?: (file: string) => Promise<void>; statFails?: (file: string) => boolean };
const hook: Hook = {};

vi.mock("node:fs/promises", async () => {
  const real = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  const readFile = (async (file: Parameters<typeof real.readFile>[0], options?: unknown) => {
    const text = await real.readFile(file, options as never);
    const once = hook.onRead;
    if (once && String(file).endsWith("log.jsonl")) {
      hook.onRead = undefined;
      await once(String(file));
    }
    return text;
  }) as typeof real.readFile;
  const stat = (async (file: Parameters<typeof real.stat>[0], options?: unknown) => {
    if (hook.statFails?.(String(file))) {
      throw Object.assign(new Error("EMFILE: too many open files"), { code: "EMFILE" });
    }
    return real.stat(file, options as never);
  }) as typeof real.stat;
  const mocked = { ...real, readFile, stat };
  return { ...mocked, default: mocked };
});

const row = (frame: number): RowSpec => ({ frame, dirty: true, extra: { dirty_reason: "stale" } });
let dir: string;

beforeEach(async () => {
  hook.onRead = undefined;
  hook.statFails = undefined;
  const root = await tempDataRoot("frameflag-guard");
  dir = await writeSession({ root, name: "g", fps: 30, rows: [row(100), row(200)] });
});

const verdict = async () => {
  const { POST } = await import("@/app/api/frame-verdict/route");
  return POST(new Request("http://local/api/frame-verdict", {
    method: "POST",
    body: JSON.stringify({ session_id: "rg-g", frame: "000200", verdict: "unusable" }),
  }));
};

const log = () => import("node:fs/promises").then((fs) => fs.readFile(path.join(dir, "log.jsonl"), "utf8"));
const backups = async () => (await readdir(dir)).filter((f) => f.startsWith("log.jsonl.bak"));

test("ein Export zwischen Lesen und Schreiben wird nicht ueberbuegelt — 409 mit Meldung", async () => {
  const exported = [row(100), row(200), row(300)].map((r) => JSON.stringify(sessionRow(r))).join("\n") + "\n";
  hook.onRead = async (file) => {
    const { writeFile } = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    await writeFile(file, exported, "utf8");
  };

  const res = await verdict();

  expect(res.status, "BUG: das Urteil schrieb seinen alten Lesestand ueber den Export").toBe(409);
  expect(((await res.json()) as { error: string }).error).toMatch(/log\.jsonl.*nochmal/);
  expect(await log(), "der Export ist weg").toBe(exported);
  expect(await backups(), "eine Sicherung eines Urteils, das nie geschrieben wurde").toEqual([]);
});

test("ohne fremden Schreiber landet das Urteil weiterhin", async () => {
  const res = await verdict();

  expect(res.status).toBe(200);
  const rows = (await log()).trim().split("\n").map((l) => JSON.parse(l) as { unusable?: boolean });
  expect(rows.map((r) => r.unusable === true)).toEqual([false, true]);
});

test("ein fs-Fehler beim Stempeln ist kein Freibrief zum Schreiben", async () => {
  const before = await log();
  hook.statFails = (file) => file.endsWith(`${path.sep}log.jsonl`);

  const res = await verdict();

  expect(res.status, "BUG: ohne Stempel geschrieben").not.toBe(200);
  expect(await log()).toBe(before);
  expect(await backups()).toEqual([]);
});
