/** Routen-Audits (2026-09-14, -16, -21, -22b): was die Routen im FEHLERFALL antworten. */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, test } from "vitest";
import { GET as FRAME } from "@/app/api/frame/[name]/[stem]/route";
import { reviewNotesPath } from "@/lib/session-store/review-notes";
import { stemOf, tempDataRoot, writeSession } from "@/lib/test-fixtures";

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("route-audit");
  await mkdir(path.join(root, "recordings", "rec-1"), { recursive: true });
});

const post = async (mod: string, body: unknown) => {
  const { POST } = (await import(mod)) as { POST: (r: Request) => Promise<Response> };
  return POST(new Request("http://local/x", { method: "POST", body: JSON.stringify(body) }));
};

const ledger = (file: string) => readFile(path.join(root, "labels", file), "utf8").catch(() => "");

describe("POST /api/review-notes with retract", () => {
  const notes = async (body: unknown) => {
    const { POST } = await import("@/app/api/review-notes/route");
    return POST(new Request("http://local/api/review-notes", { method: "POST", body: JSON.stringify(body) }));
  };

  it("reports how many notes it took back, not how many lines happen to be left", async () => {
    await notes({ rows: [{ session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" }] });
    await notes({ rows: [{ session_id: "rg-rec-1", frame: "000002", verdict: "matte-ok" }] });

    // Nichts davon steht im Ledger: ein anderer Frame, ein anderes Urteil.
    const answer = await notes({
      retract: true,
      rows: [{ session_id: "rg-rec-1", frame: "009999", verdict: "matte-ok" }],
    });

    expect(await answer.json(), "BUG: dropReviewNotes meldete kept.length als `written`").toEqual({ written: 0 });
  });

  it("still reports the retraction it really performed", async () => {
    await notes({ rows: [{ session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" }] });
    await notes({ rows: [{ session_id: "rg-rec-1", frame: "000002", verdict: "matte-ok" }] });

    const answer = await notes({
      retract: true,
      rows: [{ session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" }],
    });

    expect(await answer.json()).toEqual({ written: 1 });
  });

  it("zwei gleichzeitige Widerrufe nehmen BEIDE Zeilen aus dem Ledger", async () => {
    const note = (frame: string) => ({ session_id: "rg-a", frame, verdict: "unusable-board" });
    await notes({ rows: [note("000100"), note("000200")] });

    const [a, b] = await Promise.all([
      notes({ rows: [note("000100")], retract: true }),
      notes({ rows: [note("000200")], retract: true }),
    ]);

    expect([(await a.json()).written, (await b.json()).written], "beide melden Erfolg").toEqual([1, 1]);
    expect(await readFile(reviewNotesPath(), "utf8")).toBe("");
  });
});

describe("POST /api/corrections for a session that does not exist", () => {
  const corrections = async (rows: unknown) => {
    const { POST } = await import("@/app/api/corrections/route");
    return POST(new Request("http://local/api/corrections", { method: "POST", body: JSON.stringify({ rows }) }));
  };

  it("refuses a row whose recording is not on this machine instead of inventing the directory", async () => {
    const answer = await corrections([{ session_id: "rg-tippfehler", frame: "000001", square: "e2", label: "wP" }]);

    expect(
      await readdir(path.join(root, "recordings")),
      "BUG: appendCorrections legte eine Phantom-Aufnahme an, die danach in jeder Lane auftaucht",
    ).toEqual(["rec-1"]);
    expect(answer.status).toBe(400);
  });

  it("keeps writing the rows of a recording that does exist", async () => {
    const answer = await corrections([{ session_id: "rg-rec-1", frame: "000001", square: "e2", label: "wP" }]);

    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual({ written: 1 });
    const text = await readFile(path.join(root, "recordings", "rec-1", "corrections.jsonl"), "utf8");
    expect(text).toContain('"square":"e2"');
  });
});

describe("POST /api/unusable-cells for a session that does not exist", () => {
  it("refuses instead of creating the recording directory", async () => {
    const { POST } = await import("@/app/api/unusable-cells/route");
    const answer = await POST(
      new Request("http://local/api/unusable-cells", {
        method: "POST",
        body: JSON.stringify({ rows: [{ session_id: "rg-auch-tippfehler", frame: "000001", square: "e2" }] }),
      }),
    );

    expect(
      await readdir(path.join(root, "recordings")),
      "BUG: appendUnusableCells legt dieselbe Phantom-Aufnahme an wie /api/corrections",
    ).toEqual(["rec-1"]);
    expect(answer.status).toBe(400);
  });
});

// Kein Befund: `loadVerifyStream` schluckt jeden Lesefehler selbst, die Route antwortet.
describe("GET /api/verify without a data directory", () => {
  it("answers instead of letting a rejection escape the handler", async () => {
    delete process.env.CHESSLAB_DATA_DIR;
    const { GET } = await import("@/app/api/verify/route");

    const answer = await GET(new Request("http://local/api/verify")).catch((error: unknown) => error);

    expect(answer).toBeInstanceOf(Response);
  });
});

describe("POST /api/zuege/[name] with action reexport", () => {
  type Job = { name: string; kind?: string; state: string };
  type Queue = { jobs: Map<string, Job>; running: Promise<void>; live: unknown; stopped: Set<string> };
  const queue = () => (globalThis as { __chesslabJobs?: Queue }).__chesslabJobs;

  it("refuses instead of answering 202 with somebody else's job", async () => {
    await import("@/lib/chain/jobs");
    const q = queue()!;
    q.jobs.clear();
    // Ein Pack-Job nimmt den Heavy-Lock NICHT — die Sperre ist also frei, der Slot aber besetzt.
    q.jobs.set("rec-1", { name: "rec-1", kind: "pack", state: "queued" });

    const { POST } = await import("@/app/api/zuege/[name]/route");
    const answer = await POST(
      new Request("http://local/api/zuege/rec-1", { method: "POST", body: JSON.stringify({ action: "reexport" }) }),
      { params: Promise.resolve({ name: "rec-1" }) },
    );
    const job = (await answer.json()) as Job;
    q.jobs.clear();

    // `enqueueChain` gibt bei belegtem Slot den VORHANDENEN Job zurueck; 202 meldete einen Re-Export, der nie lief.
    expect(answer.status, "ein fremder Job darf kein 202 werden").toBe(409);
    expect(job.kind, "und schon gar nicht als Export ausgegeben werden").not.toBe("export");
  });
});

describe("the retract arm of POST /api/frame-verdict", () => {
  const SOURCES = ["app", "components", "lib"];

  async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await walk(full)));
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("stays gone until a caller exists", async () => {
    const app = process.cwd();
    const files = (await Promise.all(SOURCES.map((d) => walk(path.join(app, d))))).flat();
    const callers: string[] = [];
    for (const file of files) {
      if (file.includes(path.join("api", "frame-verdict"))) continue;
      const text = await readFile(file, "utf8");
      const at = text.indexOf("/api/frame-verdict");
      if (at >= 0 && text.slice(at, at + 400).includes("retract")) callers.push(path.relative(app, file));
    }
    const route = await readFile(path.join(app, "app", "api", "frame-verdict", "route.ts"), "utf8");

    // Entfernt 2026-09-14: kein Aufrufer schickte je `retract`. Wer den Zweig zurueckholt, baut den Knopf mit.
    if (callers.length === 0) {
      expect(route, "toter Zweig ist zurueck, ohne dass ihn jemand aufruft").not.toMatch(/retract/);
    }
  });
});

// ---- frame-verdict und corrections: leere und fehlende Rumpf-Felder --------------------------

const verdict = async (body: unknown) => {
  const { POST } = await import("@/app/api/frame-verdict/route");
  return POST(new Request("http://local/api/frame-verdict", { method: "POST", body: JSON.stringify(body) }));
};

test("frame-verdict ohne session_id schreibt kein Urteil ueber die Sitzung \"undefined\"", async () => {
  const res = await verdict({ verdict: "matte" });

  expect(res.status, "BUG: `String(undefined)` kam durch `checkName` und wurde zur Sitzung").toBe(400);
  expect(await ledger("review-notes.jsonl")).toBe("");
});

test("frame-verdict ohne frame schreibt kein Urteil ueber Frame \"undefined\"", async () => {
  const res = await verdict({ session_id: "rg-rec-1", verdict: "matte" });

  expect(res.status).toBe(400);
  expect(await ledger("review-notes.jsonl")).toBe("");
});

test("frame-verdict: der gueltige Weg schreibt weiterhin", async () => {
  const res = await verdict({ session_id: "rg-rec-1", frame: "000002", verdict: "matte" });

  expect(await res.json()).toEqual({ written: 1 });
});

test.each([
  ["leere session_id", { session_id: "", frame: "000002", verdict: "matte" }],
  ["session_id nur aus Leerzeichen", { session_id: "   ", frame: "000002", verdict: "matte" }],
  ["leerer frame", { session_id: "rg-rec-1", frame: "", verdict: "matte" }],
])("frame-verdict weist %s ab und schreibt nichts", async (_label, body) => {
  const res = await post("@/app/api/frame-verdict/route", body);

  expect(res.status).toBe(400);
  expect(await ledger("review-notes.jsonl")).toBe("");
});

test.each([
  ["ohne rows", {}],
  ["rows als Objekt", { rows: { session_id: "rg-rec-1" } }],
])("corrections weist einen Rumpf %s ab und schreibt nichts", async (_label, body) => {
  const res = await post("@/app/api/corrections/route", body);

  // `written: 0` unter 200 liest sich beim Aufrufer als "geschrieben" — deshalb 400.
  expect(res.status).toBe(400);
  expect(await ledger("corrections.jsonl")).toBe("");
});

// ---- board, frame, matte: kaputtes Material ist 500, fehlendes 404 ---------------------------

test("board: ein unlesbares exportiertes Brett ist 500, eine Aufnahme ohne Export 404", async () => {
  const dir = await writeSession({
    root, name: "kaputt", moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  });
  await mkdir(path.join(dir, "boards"), { recursive: true });
  await writeFile(path.join(dir, "boards", `${stemOf(100)}.webp`), "kein bild", "utf8");
  const { GET } = await import("@/app/api/board/[name]/[stem]/route");
  const get = (name: string) =>
    GET(new Request(`http://local/api/board/${name}/000100`), {
      params: Promise.resolve({ name, stem: "000100" }),
    });

  expect((await get("kaputt")).status, "BUG: jeder Fehler war 404, auch ein kaputtes Brett").toBe(500);
  expect((await get("rec-1")).status, "nie exportiert und kein Handy-JPEG: das ist \"nicht da\"").toBe(404);
});

const frame = (name: string, stem: string) =>
  FRAME(new Request(`http://h/api/frame/${name}/${stem}`), {
    params: Promise.resolve({ name, stem }),
  } as never);

test("ein unlesbares Review-Frame ist 500, kein 404", async () => {
  const dir = await writeSession({ root, name: "g" });
  // Ein Verzeichnis unter dem Namen des Frames: `stat` sagt "da", `readFile` wirft EISDIR.
  await mkdir(path.join(dir, "frames", "000100.webp"), { recursive: true });

  expect((await frame("g", "000100")).status).toBe(500);
});

test("ein fehlendes Review-Frame ist 404 und sagt es", async () => {
  await writeSession({ root, name: "g" });
  const res = await frame("g", "000100");
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("no such frame");
});

test("ein Pfad-Segment, das `checkName` verwirft, ist 400 — nicht 'no such frame'", async () => {
  expect((await frame("g", "..")).status).toBe(400);
});

async function samAlpha(dir: string, stem: string, side: number, fill: number): Promise<void> {
  await mkdir(path.join(dir, "mattes"), { recursive: true });
  const webp = await sharp(Buffer.alloc(side * side, fill), { raw: { width: side, height: side, channels: 1 } })
    .webp({ lossless: true })
    .toBuffer();
  await writeFile(path.join(dir, "mattes", `${stem}.webp`), webp);
}

/** Der Strichbelag des Stifts, RGBA: rot hebt das Alpha, cyan senkt es. */
async function strokes(side: number, kind: "up" | "down", box?: [number, number]): Promise<string> {
  const data = Buffer.alloc(side * side * 4);
  const [x0, x1] = box ?? [0, side];
  for (let y = x0; y < x1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * side + x) * 4;
      if (kind === "up") data[o] = 255;
      else { data[o + 1] = 255; data[o + 2] = 255; }
      data[o + 3] = 255;
    }
  }
  const png = await sharp(data, { raw: { width: side, height: side, channels: 4 } }).png().toBuffer();
  return png.toString("base64");
}

test("matte: ein zweiter Strich baut auf der HANDFASSUNG auf, nicht wieder auf SAMs Alpha", async () => {
  const side = 32;
  const dir = await writeSession({
    root, name: "malen", boardSize: side,
    rows: [{ frame: 100, boardSize: side }],
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  });
  await samAlpha(dir, stemOf(100), side, 200);
  const { POST } = await import("@/app/api/matte/[name]/[stem]/route");
  const paint = async (mask: string) =>
    POST(new Request("http://local/api/matte/malen/000100", { method: "POST", body: JSON.stringify({ mask }) }),
      { params: Promise.resolve({ name: "malen", stem: "000100" }) });

  // Erst radiert der Mensch SAMs Fund ganz weg, dann setzt er EINEN Strich in die Ecke.
  expect((await paint(await strokes(side, "down"))).status).toBe(200);
  expect((await paint(await strokes(side, "up", [0, 4]))).status).toBe(200);

  const fixed = await sharp(await readFile(path.join(dir, "mattes", `${stemOf(100)}.fixed.webp`)))
    .greyscale().raw().toBuffer();
  expect(fixed[side * side - 1], "BUG: die Radierung war weg, SAMs Alpha stand wieder da").toBe(0);
  expect(fixed[0], "der neue Strich steht").toBe(255);
});
