/** Drei Blindstellen ueber Route bzw. Seite: `ingest.sizeOf` (`-1`), `data.frameSize` (720x816), `stored`. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidElement, type ReactNode } from "react";
import sharp from "sharp";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((op: string, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (name: "stat" | "readFile", file: string, rest: unknown[]) => {
    const code = fail.on?.(name, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readFile: (file: string, ...rest: unknown[]) => hop("readFile", file, rest),
  };
});

beforeEach(() => {
  fail.on = null;
  process.env.CHESSLAB_INGEST_TOKEN = "t";
});

const same = (a: string, b: string) => path.resolve(a) === path.resolve(b);

// ---- ingest.sizeOf: `-1` war "nichts da" -------------------------------------------------------

const NAME = "2026-08-13-19-34-23";
const FILE = { path: "sessions/20260813-193423/video.mp4", bytes: 4 };
const manifest = { sessionId: "20260813-193423", files: [FILE] };
const authed = (url: string, init: RequestInit = {}) =>
  new Request(url, { ...init, headers: { authorization: "Bearer t", "content-type": "application/json" } });

test("POST /api/ingest/session: ein EACCES auf der gelandeten Datei ist kein `have: 0`", async () => {
  const root = await tempDataRoot("bs-declare");
  const landed = path.join(root, "recordings", NAME, "files", FILE.path);
  await mkdir(path.dirname(landed), { recursive: true });
  await writeFile(landed, "abcd");
  fail.on = (op, file) => (op === "stat" && same(file, landed) ? "EACCES" : null);
  const { POST } = await import("@/app/api/ingest/session/route");
  const res = await POST(authed("http://x/api/ingest/session", { method: "POST", body: JSON.stringify(manifest) }));
  const body = await res.json();
  expect(body.have, "sonst laedt das Handy die Datei komplett neu").toBeUndefined();
  expect(res.status).not.toBe(200);
  expect(body.error).toMatch(/EACCES/);
});

test("GET /api/ingest/jobs: ein EACCES auf dem `.partial` nimmt den Transfer nicht aus „in Flug\"", async () => {
  const root = await tempDataRoot("bs-pending");
  const staging = path.join(root, "inbox", NAME);
  await mkdir(path.join(staging, path.dirname(FILE.path)), { recursive: true });
  await writeFile(path.join(staging, "manifest.json"), JSON.stringify(manifest));
  await writeFile(path.join(staging, FILE.path + ".partial"), "ab");
  fail.on = (op, file) => (op === "stat" && file.endsWith(".partial") ? "EACCES" : null);
  const { GET } = await import("@/app/api/ingest/jobs/route");
  const res = await GET();
  const body = await res.json();
  expect(body.pending, "eine leere Liste hiesse: nichts unterwegs").toBeUndefined();
  expect(res.status).toBe(500);
  expect(body.error).toMatch(/EACCES/);
});

test("GET /api/ingest/jobs: ohne Fehler zaehlt das `.partial` mit seiner echten Groesse", async () => {
  const root = await tempDataRoot("bs-pending-ok");
  const staging = path.join(root, "inbox", NAME);
  await mkdir(path.join(staging, path.dirname(FILE.path)), { recursive: true });
  await writeFile(path.join(staging, "manifest.json"), JSON.stringify(manifest));
  await writeFile(path.join(staging, FILE.path + ".partial"), "ab");
  const { GET } = await import("@/app/api/ingest/jobs/route");
  expect((await (await GET()).json()).pending).toEqual([{ name: NAME, bytes: 2, files: 1 }]);
});

// ---- data.frameSize: 720x816 war eine geratene Groesse -----------------------------------------

/** Jedes Element im Baum, das [key] als Prop traegt — die Seite reicht die Karten nach unten. */
function propsWith(node: ReactNode, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) node.forEach((n) => propsWith(n, key, out));
  else if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (key in props) out.push(props[key]);
    propsWith(props.children as ReactNode, key, out);
  }
  return out;
}

async function confirmFixture(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const move = { ply: 1, san: "e4", frame: 1, fen_after: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" };
  const dir = await writeSession({ root, moves: [move], candidate: { start_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" } });
  await mkdir(path.join(dir, "frames"), { recursive: true });
  const board = await sharp({ create: { width: 928, height: 928, channels: 3, background: "#000" } }).webp().toBuffer();
  for (const stem of ["000001", "000002"]) await writeFile(path.join(dir, "frames", `${stem}.webp`), board);
  return dir;
}

/** Der erste Import der Seite uebersetzt ihren ganzen Baum — kalt ueber 5 s. */
const PAGE_TIMEOUT = 30_000;
const confirmPage = async () =>
  (await import("@/app/confirm/[name]/page")).default({ params: Promise.resolve({ name: "g" }) } as never);

test("/confirm/<name>: ein EACCES auf einem Frame ist keine Karte mit 720x816", async () => {
  await confirmFixture("bs-confirm-read");
  fail.on = (op, file) => (op === "readFile" && file.endsWith("000002.webp") ? "EACCES" : null);
  await expect(confirmPage()).rejects.toThrow(/EACCES/);
}, PAGE_TIMEOUT);

test("/confirm/<name>: jede Karte traegt die GEMESSENE Groesse, ein verschwundener Frame fehlt", async () => {
  await confirmFixture("bs-confirm-gone");
  // Nach `stat`, vor dem Lesen weg: genau die Luecke, in die 720x816 fiel.
  fail.on = (op, file) => (op === "readFile" && file.endsWith("000002.webp") ? "ENOENT" : null);
  const cards = propsWith(await confirmPage(), "cards").flat() as { stems: { stem: string; width: number; height: number }[] }[];
  expect(cards.length).toBeGreaterThan(0);
  const stems = cards.flatMap((c) => c.stems);
  expect(stems.map((s) => [s.stem, s.width, s.height])).toEqual([["000001", 928, 928]]);
}, PAGE_TIMEOUT);

// ---- stored: eine kaputte Zeile MITTENDRIN wurde zu "kein Frame" --------------------------------

const row = (stem: string) =>
  JSON.stringify({ frame: `frames/${stem}.jpg`, ply: 1, fen: "8/8/8/8/8/8/8/8", corners: [[0, 0], [1, 0], [1, 1], [0, 1]] });

/** Ein Bundle OHNE Export (keine `log.jsonl` an der Wurzel): beide Routen fallen aufs Handy-Log. */
async function storedLog(prefix: string, text: string): Promise<string> {
  const session = path.join(await tempDataRoot(prefix), "recordings", "g", "files", "sessions", "s1");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "log.jsonl"), text, "utf8");
  return path.join(session, "log.jsonl");
}

const board = async (stem: string) =>
  (await import("@/app/api/board/[name]/[stem]/route")).GET(new Request(`http://x/api/board/g/${stem}`), {
    params: Promise.resolve({ name: "g", stem }),
  });
const cell = async (stem: string) =>
  (await import("@/app/api/cell/[name]/[stem]/[square]/route")).GET(new Request(`http://x/api/cell/g/${stem}/e4`), {
    params: Promise.resolve({ name: "g", stem, square: "e4" }),
  });

test("GET /api/board: die Zeile, die MITTENDRIN kaputt ist, ist kein 404 „kein Frame\"", async () => {
  await storedLog("bs-board-mid", `${row("0000")}\n{"frame": "frames/0001.jpg", "ply":\n${row("0002")}\n`);
  const res = await board("0001");
  expect(res.status).toBe(500);
  expect(await res.text()).toMatch(/beschaedigte Zeile/);
});

test("GET /api/cell: dieselbe kaputte Zeile ist auch dort kein 404", async () => {
  await storedLog("bs-cell-mid", `${row("0000")}\n{"frame": "frames/0001.jpg", "ply":\n${row("0002")}\n`);
  const res = await cell("0001");
  expect(res.status).toBe(500);
  expect((await res.json()).error).toMatch(/beschaedigte Zeile/);
});

test("GET /api/board: die halbe LETZTE Zeile bleibt verziehen — nur sie fehlt", async () => {
  await storedLog("bs-board-tail", `${row("0000")}\n{"frame": "frames/0001.jpg", "ply":`);
  expect((await board("0001")).status).toBe(404);
});
