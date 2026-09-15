/**
 * Audit 2026-09-14: Befunde in `app/api/**`, jeder mit seinem roten Test.
 * Kein Fix in dieser Datei — sie beweist nur, dass die Route heute die falsche Antwort gibt.
 */
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "chesslab-route-audit-"));
  await mkdir(path.join(root, "recordings", "rec-1"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
});

afterEach(async () => {
  delete process.env.CHESSLAB_DATA_DIR;
  await rm(root, { recursive: true, force: true });
});

describe("POST /api/review-notes with retract", () => {
  const post = async (body: unknown) => {
    const { POST } = await import("@/app/api/review-notes/route");
    return POST(new Request("http://local/api/review-notes", { method: "POST", body: JSON.stringify(body) }));
  };

  it("reports how many notes it took back, not how many lines happen to be left", async () => {
    await post({ rows: [{ session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" }] });
    await post({ rows: [{ session_id: "rg-rec-1", frame: "000002", verdict: "matte-ok" }] });

    // Nichts davon steht im Ledger: ein anderer Frame, ein anderes Urteil.
    const answer = await post({
      retract: true,
      rows: [{ session_id: "rg-rec-1", frame: "009999", verdict: "matte-ok" }],
    });

    expect(
      await answer.json(),
      "BUG: dropReviewNotes gibt kept.length zurueck — ein Widerruf, der NICHTS entfernt, meldet die " +
        "Restzeilen des ganzen Ledgers als `written`",
    ).toEqual({ written: 0 });
  });

  it("still reports the retraction it really performed", async () => {
    await post({ rows: [{ session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" }] });
    await post({ rows: [{ session_id: "rg-rec-1", frame: "000002", verdict: "matte-ok" }] });

    const answer = await post({
      retract: true,
      rows: [{ session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" }],
    });

    expect(await answer.json()).toEqual({ written: 1 });
  });
});

describe("POST /api/corrections for a session that does not exist", () => {
  const post = async (rows: unknown) => {
    const { POST } = await import("@/app/api/corrections/route");
    return POST(new Request("http://local/api/corrections", { method: "POST", body: JSON.stringify({ rows }) }));
  };

  it("refuses a row whose recording is not on this machine instead of inventing the directory", async () => {
    const answer = await post([{ session_id: "rg-tippfehler", frame: "000001", square: "e2", label: "wP" }]);

    expect(
      await readdir(path.join(root, "recordings")),
      "BUG: appendCorrections legt via mkdir(recursive) eine Phantom-Aufnahme an — sie taucht danach " +
        "in listGames und damit in jeder Lane auf, mit Trainingseingabe darin",
    ).toEqual(["rec-1"]);
    expect(answer.status).toBe(400);
  });

  it("keeps writing the rows of a recording that does exist", async () => {
    const answer = await post([{ session_id: "rg-rec-1", frame: "000001", square: "e2", label: "wP" }]);

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

describe("POST /api/corrections with a malformed body", () => {
  it("says no rows were understood rather than answering 200 for a body it ignored", async () => {
    const { POST } = await import("@/app/api/corrections/route");
    const answer = await POST(
      new Request("http://local/api/corrections", {
        method: "POST",
        // `row` statt `rows` — ein Tippfehler im Client, den heute nichts meldet.
        body: JSON.stringify({ row: [{ session_id: "rg-rec-1", frame: "000001", square: "e2", label: "wP" }] }),
      }),
    );

    expect(
      answer.status,
      "BUG: `rows` ist kein Array -> rows = [] -> 200 {written:0}; der Client haelt seine Urteile fuer geschrieben",
    ).toBe(400);
  });
});

// GRUEN, kein Befund: /api/verify hat als einzige Lese-Route kein try/catch, aber
// `loadVerifyStream` schluckt jeden Lesefehler selbst. Der Test haelt das fest.
describe("GET /api/verify without a data directory", () => {
  it("answers instead of letting a rejection escape the handler", async () => {
    delete process.env.CHESSLAB_DATA_DIR;
    const { GET } = await import("@/app/api/verify/route");

    const answer = await GET(new Request("http://local/api/verify")).catch((error: unknown) => error);

    expect(answer).toBeInstanceOf(Response);
  });
});

describe("GET /api/cell when the exported log is unreadable", () => {
  it("surfaces the broken log instead of silently serving the phone's stored JPEGs", async () => {
    const game = path.join(root, "recordings", "rec-1");
    // Exportiert: candidate.json und log.jsonl liegen da — aber das Log ist kaputt.
    await writeFile(path.join(game, "candidate.json"), JSON.stringify({ name: "rec-1", clock: { fps: 25 }, moves: [] }), "utf8");
    await mkdir(path.join(game, "frames"), { recursive: true });
    await writeFile(path.join(game, "log.jsonl"), "{ das ist kein JSON\n", "utf8");

    const { GET } = await import("@/app/api/cell/[name]/[stem]/[square]/route");
    const answer = await GET(new Request("http://local/api/cell/rec-1/000001/e2"), {
      params: Promise.resolve({ name: "rec-1", stem: "000001", square: "e2" }),
    });

    expect(
      await answer.text(),
      "BUG: `loadSession(name).then(()=>true,()=>false)` macht aus JEDEM Lesefehler ein 'nie " +
        "exportiert' — die Route faellt auf `storedCellPng` zurueck und der Fehler im Log ist weg",
    ).toMatch(/log\.jsonl|JSON/);
  });
});

describe("POST /api/zuege/[name] with action reexport", () => {
  type Job = { name: string; kind?: string; state: string };
  type Queue = { jobs: Map<string, Job>; running: Promise<void>; live: unknown; stopped: Set<string> };
  const queue = () => (globalThis as { __chesslabJobs?: Queue }).__chesslabJobs;

  it("refuses instead of answering 202 with somebody else's job", async () => {
    await import("@/lib/jobs");
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

    // `enqueueChain` gibt bei einem belegten Slot den VORHANDENEN Job zurueck, ohne einzureihen.
    // Ein 202 darauf meldete "Re-Export gestartet", waehrend nichts lief.
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

    // Entfernt am 2026-09-14: kein Aufrufer schickte je `retract` hierher, `!retract` war immer
    // `true` und `dropReviewNotes` unerreichbar. Wer den Zweig zurueckholt, baut den Knopf mit.
    if (callers.length === 0) {
      expect(route, "toter Zweig ist zurueck, ohne dass ihn jemand aufruft").not.toMatch(/retract/);
    }
  });
});
