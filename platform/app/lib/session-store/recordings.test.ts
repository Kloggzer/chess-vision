import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { listFrameStems, readReference, requireRecording, truthSans, writeConfirmation } from "@/lib/session-store/recordings";
import { lcsReport } from "@/lib/lcs";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readFile: (f: string, ...r: unknown[]) => hop("readFile", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
    open: (f: string, ...r: unknown[]) => hop("open", f, r),
  };
});

/** Same fixture as `tests/test_realgames.py::_candidate`. */
const PGN = '[Event "t"]\n\n1. e4 e5 2. Nf3 Nc6 *\n';
/** Written as TEXT, not as an object: `0.0` is exactly the byte the writer must not round off. */
const CANDIDATE = JSON.stringify(
  {
    name: "g",
    confirmed: false,
    geometry: { board_size: 928, margin: "@0.0@" },
    moves: ["e4", "d4", "Nf3", "Nc6"].map((san, i) => ({
      ply: i + 1,
      san,
      frame: 100 * (i + 1),
      decider: "cnn_occupancy",
    })),
  },
  null,
  2,
).replace('"@0.0@"', "0.0");

let root: string;
let file: string;

beforeEach(async () => {
  fail.on = null;
  root = await tempDataRoot("app");
  const dir = path.join(root, "recordings", "g");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "reference.pgn"), PGN, "utf8");
  file = path.join(dir, "candidate.json");
  await writeFile(file, CANDIDATE + "\n", "utf8");
});

test("lcs mirrors the python/kotlin semantics", () => {
  const { matched, invented, missed } = lcsReport(["a", "b", "c", "d"], ["a", "x", "c"]);
  expect(matched.length).toBe(2);
  expect(invented).toEqual([1]);
  expect(missed).toEqual([1, 3]);
});

test("the confirm POST writes only the three keys", async () => {
  const before = JSON.parse(await readFile(file, "utf8"));
  const { POST } = await import("@/app/api/confirm/[name]/route");

  const response = await POST(
    new Request("http://localhost/api/confirm/g", {
      method: "POST",
      body: JSON.stringify({ kept: [] }),
    }),
    { params: Promise.resolve({ name: "g" }) },
  );
  expect(response.status).toBe(200);

  const text = await readFile(file, "utf8");
  const after = JSON.parse(text);
  // The key-set diff of tests/test_realgames.py::test_confirm_writes_only_its_own_keys.
  const added = Object.keys(after).filter((k) => !(k in before));
  // Plus der Referenzstand (docs/offene-entscheidungen.md, Urteils-Revisionen).
  expect(new Set(added)).toEqual(new Set(["confirmed_at", "reviewed_plies", "confirmed_reference"]));
  expect(before.confirmed).toBe(false);
  expect(after.confirmed).toBe(true);
  expect(after.confirmed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  for (const key of Object.keys(before).filter((k) => k !== "confirmed")) {
    expect(after[key], key).toEqual(before[key]);
  }
  expect(after.reviewed_plies).toEqual([1, 3, 4]); // "d4" is invented and was not kept
  expect(text.endsWith("\n")).toBe(true);
  expect(text).toContain('"margin": 0.0'); // untouched keys keep their bytes, not just their value
});

describe("a matched ply the human strikes", () => {
  // The replay's `Nf6` matches the reference's own `Nf6` two plies later, so the LCS calls it
  // reviewed while its commit window still showed `e5` — the position that ply stamps never existed.
  beforeEach(async () => {
    const dir = await writeSession({
      root, name: "t",
      moves: ["e4", "Nf6", "Nf3", "e5", "Nc3"].map((san, i) => ({ ply: i + 1, san, frame: 100 * (i + 1) })),
    });
    await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 2. Nf3 Nf6 3. Nc3 *");
  });

  it("leaves the reviewed set — a transposition matches SANs, not positions", async () => {
    expect(await writeConfirmation("t", [], [])).toContain(2);
    expect(await writeConfirmation("t", [], [2])).not.toContain(2);
  });

  // `drop` wurde nie gespeichert: der naechste Aufrufer ohne Liste holte die Plies zurueck, und `/api/zuege` schickt nie eine.
  it("a struck ply stays struck when the next confirm sends no drop list", async () => {
    expect(await writeConfirmation("t", [], [2])).not.toContain(2);
    const again = await writeConfirmation("t", []);
    expect(again, "BUG: /api/zuege confirms without `drop` and the struck ply is back").not.toContain(2);
  });

  it("the /api/zuege commit does not resurrect it either", async () => {
    await writeConfirmation("t", [], [2]);
    const { POST } = await import("@/app/api/zuege/[name]/route");
    const answer = await POST(
      new Request("http://local/api/zuege/t", { method: "POST", body: JSON.stringify({ action: "undo", kept: [] }) }),
      { params: Promise.resolve({ name: "t" }) },
    );
    expect(((await answer.json()) as { reviewed_plies: number[] }).reviewed_plies).not.toContain(2);
  });
});

describe("readReference: eine UNLESBARE reference.pgn ist keine fehlende", () => {
  // Sonst schrieb die Confirm-Seite "keine reference.pgn", und `referenceProblem` blieb leer.
  const dir = () => path.join(root, "recordings", "r");
  beforeEach(() => mkdir(dir(), { recursive: true }));

  it("eine fehlende reference.pgn bleibt `keine Referenz`", async () => {
    expect(await readReference("r")).toBeNull();
    expect(await truthSans("r")).toBeNull();
  });

  it("eine LESBARE reference.pgn wird gelesen", async () => {
    await writeFile(path.join(dir(), "reference.pgn"), "1. e4 e5 2. Nf3 *\n");
    expect(await truthSans("r")).toEqual(["e4", "e5", "Nf3"]);
  });

  it("eine UNLESBARE reference.pgn ist keine fehlende", async () => {
    // Ein Verzeichnis an der Stelle der Datei: `readFile` wirft EISDIR, nicht ENOENT.
    await mkdir(path.join(dir(), "reference.pgn"));
    await expect(readReference("r")).rejects.toMatchObject({ code: "EISDIR" });
    await expect(truthSans("r")).rejects.toMatchObject({ code: "EISDIR" });
  });

  it("keine Seite macht daraus wieder ein `keine PGN`", async () => {
    for (const rel of ["app/page.tsx", "app/game/[name]/page.tsx"]) {
      const text = await readFile(path.join(__dirname, "../..", rel), "utf8");
      expect(/truthSans\([^)]*\)\s*\.catch/.test(text), rel).toBe(false);
    }
  });
});

describe("listFrameStems: ein Fehler ist keine Groesse und keine leere Aufnahme", () => {
  // `frameSize` lieferte fuer jeden Fehler 720x816 — eine GERATENE Groesse, auf die die Karte ihre Zugpfeile legt.
  async function frames(second?: Buffer): Promise<void> {
    const dir = path.join(root, "recordings", "s", "frames");
    await mkdir(dir, { recursive: true });
    const board = await sharp({ create: { width: 928, height: 928, channels: 3, background: "#000" } }).webp().toBuffer();
    await writeFile(path.join(dir, "000001.webp"), board);
    await writeFile(path.join(dir, "000002.webp"), second ?? board);
  }

  it("ein I/O-Fehler am Review-Verzeichnis ist kein „keine Frames\"", async () => {
    await frames();
    fail.on = (op, f) => ((op === "stat" || op === "readdir") && f.includes("review-extra") ? "EACCES" : null);
    await expect(listFrameStems("s")).rejects.toThrow(/EACCES/);
  });

  it("ein Frame, der nach `readdir` verschwindet, faellt weg statt 720x816 zu bekommen", async () => {
    await frames();
    fail.on = (op, f) => (op === "stat" && f.includes("000002") ? "ENOENT" : null);
    expect(await listFrameStems("s")).toEqual([{ stem: "000001", kind: "labeled", width: 928, height: 928 }]);
  });

  it("ein EACCES beim Lesen des Frames ist keine Groesse von 720x816", async () => {
    await frames();
    fail.on = (op, f) => (op === "readFile" && f.includes("000002") ? "EACCES" : null);
    await expect(listFrameStems("s")).rejects.toThrow(/EACCES/);
  });

  it("ein EACCES beim Suchen des Frames ist kein „Frame weg\"", async () => {
    await frames();
    fail.on = (op, f) => (op === "stat" && f.includes("000002") ? "EACCES" : null);
    await expect(listFrameStems("s")).rejects.toThrow(/EACCES/);
  });

  it("ein unlesbarer Bildkopf wirft statt zu raten", async () => {
    await frames(Buffer.from("x"));
    await expect(listFrameStems("s")).rejects.toThrow();
  });
});

describe("requireRecording", () => {
  // Jeder `stat`-Fehler hiess „keine Aufnahme" — ein EACCES schickte den Menschen suchen.
  it("ein EACCES am Aufnahmeverzeichnis ist keine fehlende Aufnahme", async () => {
    const dir = path.join(root, "recordings");
    fail.on = (op, f) => (op === "stat" && f === dir ? "EACCES" : null);
    await expect(requireRecording(dir, "g")).rejects.toThrow(/EACCES/);
  });

  it("eine wirklich fehlende Aufnahme sagt es weiter", async () => {
    await expect(requireRecording(path.join(root, "nirgends"), "g")).rejects.toThrow(/keine Aufnahme/);
  });
});
