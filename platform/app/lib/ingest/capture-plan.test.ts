import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { GET as COVERAGE } from "@/app/api/capture/coverage/route";
import { GET as PLAN } from "@/app/api/capture/plan/route";
import { coverageResponse, loadCoverage, loadPlan, planResponse } from "@/lib/ingest/capture-plan";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` des Lesers vorbei.
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

const SHOT = {
  id: "01-sehr-hell",
  reason: "1 Figuren, Baender sehr hell",
  place: [{ square: "h3", piece: "wQ", band: "sehr hell", lo: 180, hi: 256 }],
  height: "normal",
  orientations: 8,
  closes: [{ piece: "wQ", square_color: "light", band: "sehr hell", have: 0, fix: "Stellung", corpus_in_band: 12 }],
};

let reports = "";

async function report(file: string, body: unknown) {
  await writeFile(path.join(reports, file), typeof body === "string" ? body : JSON.stringify(body), "utf8");
}

function get(token = TOKEN) {
  return new Request("http://x/api/capture", { headers: { authorization: `Bearer ${token}` } });
}

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (file.includes(needle)) throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

beforeEach(async () => {
  const root = await tempDataRoot("capture");
  reports = path.join(root, "reports");
  await mkdir(reports, { recursive: true });
  process.env.CHESSLAB_INGEST_TOKEN = TOKEN;
  fail.on = null;
});

test("the plan comes back whole, every schema key included", async () => {
  await report("capture-plan.json", { generated_at: "2026-09-12T10:00:00", dataset: "d", gaps_from: "g", shots: [SHOT] });
  const body = await (await planResponse(get())).json();
  expect(body.shots).toEqual([SHOT]);
  expect(body.dataset).toBe("d");
});

test("coverage carries the file's mtime, because it cannot be live", async () => {
  await report("coverage-gaps.json", { gaps: [], counted: 7 });
  const body = await (await coverageResponse(get())).json();
  expect(body.counted).toBe(7);
  expect(Date.parse(body.generated_at)).toBeGreaterThan(0);
});

test("without pairing both routes refuse", async () => {
  await report("capture-plan.json", { generated_at: "x", dataset: "d", gaps_from: "g", shots: [SHOT] });
  await report("coverage-gaps.json", { gaps: [] });
  for (const answer of [await planResponse(get("falsch")), await coverageResponse(new Request("http://x/api/capture"))]) {
    expect(answer.status).toBe(401);
    expect(await answer.json()).toEqual({ error: "unpaired" });
  }
});

// H3 (2026-09-22c): nur ENOENT ist ein ungelaufener Befehl — sonst riet der Leser zum Ueberschreiben.
test("und die Route meldet ihn dem Handy als 500 mit Grund", async () => {
  await report("capture-plan.json", "{}");
  blowUpOn("capture-plan.json", "EACCES");
  const answer = await planResponse(get());
  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/EACCES/);
});

test("dasselbe fuer die Abdeckung, auch wenn nur der Stempel scheitert", async () => {
  await report("coverage-gaps.json", '{"gaps":[]}');
  blowUpOn("coverage-gaps.json", "EMFILE");
  const answer = await coverageResponse(get());
  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/EMFILE/);
});

test("ein FEHLENDER Bericht nennt weiter den Befehl", async () => {
  expect(await loadPlan()).toEqual({ shots: [], why: expect.stringContaining("chesslab capture plan") });
  expect(await loadCoverage()).toEqual({ shots: [], why: expect.stringContaining("coverage_gaps.py") });
});

test("ein halber capture-plan.json wird als {error} beantwortet, nicht geworfen", async () => {
  await report("capture-plan.json", "{halb geschrieben");
  const res = await PLAN(get());
  expect(res.status).toBe(500);
  expect((await res.json()).error).toBeTruthy();
});

test("ein halber coverage-gaps.json wird als {error} beantwortet, nicht geworfen", async () => {
  await report("coverage-gaps.json", "{halb geschrieben");
  const res = await COVERAGE(get());
  expect(res.status).toBe(500);
  expect((await res.json()).error).toBeTruthy();
});
