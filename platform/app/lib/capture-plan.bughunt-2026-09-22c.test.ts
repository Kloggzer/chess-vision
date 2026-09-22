/**
 * H3: „Kein Plan ist ein ungelaufener Befehl" gilt nur fuer ENOENT. `loadPlan`/`loadCoverage`
 * fingen JEDEN Lesefehler als `null` und rieten dann zu dem Befehl, der den vorhandenen Bericht
 * ueberschreibt — `guarded` haette `{error}` mit 500 geliefert, bekam den Fehler aber nie.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Der Fehler muss ABLEHNEN, nicht werfen: ein synchroner Wurf laeuft am `.catch` des Lesers
  // vorbei und liesse die Gegenprobe gruen — genau der Griff, den diese Probe misst.
  const hook = (name: "readFile" | "stat") => (file: string, ...rest: unknown[]) => {
    try {
      fail.on?.(String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return { ...real, readFile: hook("readFile"), stat: hook("stat") };
});

const TOKEN = "kopplung";
let reports = "";

beforeEach(async () => {
  const root = await tempDataRoot("capture-bughunt");
  reports = path.join(root, "reports");
  await mkdir(reports, { recursive: true });
  process.env.CHESSLAB_INGEST_TOKEN = TOKEN;
  fail.on = null;
});

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (file.includes(needle)) throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

const get = () => new Request("http://x/api/capture", { headers: { authorization: `Bearer ${TOKEN}` } });

test("ein unlesbarer Plan ist kein ungelaufener Befehl", async () => {
  await writeFile(path.join(reports, "capture-plan.json"), "{}", "utf8");
  const { loadPlan } = await import("@/lib/capture-plan");
  blowUpOn("capture-plan.json", "EMFILE");
  await expect(loadPlan()).rejects.toThrow(/EMFILE/);
});

test("und die Route meldet ihn dem Handy als 500 mit Grund", async () => {
  await writeFile(path.join(reports, "capture-plan.json"), "{}", "utf8");
  const { planResponse } = await import("@/lib/capture-plan");
  blowUpOn("capture-plan.json", "EACCES");
  const answer = await planResponse(get());
  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/EACCES/);
});

test("dasselbe fuer die Abdeckung, auch wenn nur der Stempel scheitert", async () => {
  await writeFile(path.join(reports, "coverage-gaps.json"), '{"gaps":[]}', "utf8");
  const { coverageResponse } = await import("@/lib/capture-plan");
  blowUpOn("coverage-gaps.json", "EMFILE");
  const answer = await coverageResponse(get());
  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/EMFILE/);
});

test("ein FEHLENDER Bericht nennt weiter den Befehl", async () => {
  const { loadPlan, loadCoverage } = await import("@/lib/capture-plan");
  expect(await loadPlan()).toEqual({ shots: [], why: expect.stringContaining("chesslab capture plan") });
  expect(await loadCoverage()).toEqual({ shots: [], why: expect.stringContaining("coverage_gaps.py") });
});
