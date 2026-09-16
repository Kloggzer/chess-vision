import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { GET as COVERAGE } from "@/app/api/capture/coverage/route";
import { GET as PLAN } from "@/app/api/capture/plan/route";
import { GET as FRAME } from "@/app/api/frame/[name]/[stem]/route";
import { POST as REVIEW_NOTES } from "@/app/api/review-notes/route";
import { commitPage } from "@/lib/matte-page";
import { reviewNotesPath } from "@/lib/review-notes";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/**
 * Vier Funde in der `app/`-Schicht, die `vitest.config.mts` nicht einsammelt. Jeder ist ein
 * `test.fails` — der Fix steht aus, der Fund ist gepinnt.
 */

// ---- 1. Zwei Widerrufe gleichzeitig, einer ueberlebt nicht -------------------------------------

const note = (frame: string) => ({ session_id: "rg-a", frame, verdict: "unusable-board" });
const notes = (body: unknown) =>
  REVIEW_NOTES(new Request("http://h/api/review-notes", { method: "POST", body: JSON.stringify(body) }));

test.fails("zwei gleichzeitige Widerrufe nehmen BEIDE Zeilen aus dem Ledger", async () => {
  await tempDataRoot("review-notes-race");
  await notes({ rows: [note("000100"), note("000200")] });

  const [a, b] = await Promise.all([
    notes({ rows: [note("000100")], retract: true }),
    notes({ rows: [note("000200")], retract: true }),
  ]);

  expect([(await a.json()).written, (await b.json()).written], "beide melden Erfolg").toEqual([1, 1]);
  expect(await readFile(reviewNotesPath(), "utf8")).toBe("");
});

// ---- 2. Der Seiten-Commit der Matte-Lane leert die Marken ALLER Seiten -------------------------

test.fails("ein Seiten-Commit laesst die Marken der anderen Seiten stehen", () => {
  const seite1 = ["a|000100", "a|000200"];
  const seite2 = ["a|000300"];
  const marked = new Set([...seite1, ...seite2]);

  const plan = commitPage(seite2, marked, new Set<string>());

  expect(plan.verdicts, "geschrieben wird nur die Seite").toEqual({ "a|000300": "matte-bad" });
  expect([...plan.marked].sort(), "Seite 1 bleibt markiert").toEqual(seite1);
});

// ---- 3. Die Frame-Route macht aus jedem Fehler ein 404 ----------------------------------------

const frame = (name: string, stem: string) =>
  FRAME(new Request(`http://h/api/frame/${name}/${stem}`), {
    params: Promise.resolve({ name, stem }),
  } as never);

test.fails("ein unlesbares Review-Frame ist 500, kein 404", async () => {
  const root = await tempDataRoot("frame-status");
  const dir = await writeSession({ root, name: "g" });
  // Ein Verzeichnis unter dem Namen des Frames: `stat` sagt "da", `readFile` wirft EISDIR.
  await mkdir(path.join(dir, "frames", "000100.webp"), { recursive: true });

  expect((await frame("g", "000100")).status).toBe(500);
});

test.fails("ein Pfad-Segment, das `checkName` verwirft, ist 400 — nicht 'no such frame'", async () => {
  await tempDataRoot("frame-name");
  expect((await frame("g", "..")).status).toBe(400);
});

// ---- 4. Die capture-Routen fangen ihren kaputten Bericht nicht --------------------------------

const paired = () => new Request("http://h/x", { headers: { authorization: "Bearer t" } });

async function corruptReports(prefix: string): Promise<void> {
  process.env.CHESSLAB_INGEST_TOKEN = "t";
  const root = await tempDataRoot(prefix);
  await mkdir(path.join(root, "reports"), { recursive: true });
  for (const file of ["capture-plan.json", "coverage-gaps.json"]) {
    await writeFile(path.join(root, "reports", file), "{halb geschrieben", "utf8");
  }
}

test.fails("ein halber capture-plan.json wird als {error} beantwortet, nicht geworfen", async () => {
  await corruptReports("capture-plan");
  const res = await PLAN(paired());
  expect(res.status).toBe(500);
  expect((await res.json()).error).toBeTruthy();
});

test.fails("ein halber coverage-gaps.json wird als {error} beantwortet, nicht geworfen", async () => {
  await corruptReports("capture-coverage");
  const res = await COVERAGE(paired());
  expect(res.status).toBe(500);
  expect((await res.json()).error).toBeTruthy();
});
