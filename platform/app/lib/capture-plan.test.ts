import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { coverageResponse, loadPlan, planResponse } from "@/lib/capture-plan";

const TOKEN = "kopplung";

const SHOT = {
  id: "wq-light-sehr-hell",
  fix: "Stellung",
  reason: "wQ auf hellem Feld, Band 'sehr hell': 0 Belege",
  place: [{ square: "h3", piece: "wQ" }],
  light: null,
  reference_square: "h3",
  height: "normal",
  orientations: 8,
  closes: [{ piece: "wQ", square_color: "light", band: "sehr hell", have: 0, fix: "Stellung", corpus_in_band: 12 }],
};

let reports = "";

async function report(file: string, body: unknown) {
  await writeFile(path.join(reports, file), JSON.stringify(body), "utf8");
}

function get(token = TOKEN) {
  return new Request("http://x/api/capture", { headers: { authorization: `Bearer ${token}` } });
}

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-capture-"));
  reports = path.join(root, "reports");
  await mkdir(reports, { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
  process.env.CHESSLAB_INGEST_TOKEN = TOKEN;
});

test("a missing plan names the command instead of claiming full coverage", async () => {
  expect(await loadPlan()).toEqual({ shots: [], why: expect.stringContaining("chesslab capture plan") });
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
