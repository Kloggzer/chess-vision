import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { POST } from "@/app/api/pgn/[name]/route";
import { stampOf } from "@/lib/atomic";
import { tempDataRoot } from "@/lib/test-fixtures";
import { parseReference } from "./pgn";

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

beforeEach(() => {
  fail.on = null;
});

const HEAD = '[Event "chesslab"]\n[Result "*"]\n\n';

test("a one-game file is its mainline", () => {
  expect(parseReference(`${HEAD}1. e4 e5 2. Nf3 *\n`)).toEqual({ sans: ["e4", "e5", "Nf3"], problem: null, more: 0 });
});

/** 2026-08-30-16-20-19: the phone wrote the continuation after a seam as a second game. */
test("the first game is the reference, the continuation is counted", () => {
  const text =
    `${HEAD}1. d4 d5 2. e4 *\n\n` +
    '[Event "chesslab"]\n[Result "0-1"]\n[SetUp "1"]\n[FEN "rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2"]\n\n' +
    "2... e5 {position rebuilt by cnn_pair} 3. Nf3 0-1\n";
  expect(parseReference(text)).toEqual({ sans: ["d4", "d5", "e4"], problem: null, more: 1 });
});

/** 2026-08-12-11-19-00: the phone's own record plays d5 twice — unreadable, and it says so. */
test("an illegal mainline is a problem, not a crash", () => {
  const out = parseReference(`${HEAD}1. e4 d5 2. Nc3 Nf6 3. d4 d5 *\n`);
  expect(out.sans).toBeNull();
  expect(out.problem).toMatch(/d5/);
});

test("a corrected reference replaces the wrong move and stays readable", () => {
  const ref = parseReference('[Event "chesslab"]\n\n1. e4 e5 2. d4 d5 3. Nf3 Nc6 4. Nxe5 Nxe5 *\n');
  expect(ref.problem).toBeNull();
  expect(ref.sans?.slice(6)).toEqual(["Nxe5", "Nxe5"]);
});

describe("POST /api/pgn/[name] data-safety regressions", () => {
  const GAME = "proof-game";
  let game: string;

  beforeEach(async () => {
    game = path.join(await tempDataRoot("pgn-route"), "recordings", GAME);
    await mkdir(game, { recursive: true });
    await writeFile(path.join(game, "reference.pgn"), "1. e4 e5 *\n", "utf8");
  });

  const upload = (pgn: string, replace = true) =>
    POST(new Request(`http://local/api/pgn/${GAME}${replace ? "?replace=1" : ""}`, { method: "POST", body: pgn }), {
      params: Promise.resolve({ name: GAME }),
    });

  it("keeps a recovery copy before overwriting the human reference PGN", async () => {
    expect((await upload("1. d4 d5 *\n")).status).toBe(200);

    const backups = (await readdir(game)).filter((name) => name.startsWith("reference.pgn.bak"));
    expect(
      backups,
      "BUG: replacing reference.pgn destroys the last human truth without any recovery copy",
    ).not.toHaveLength(0);
    expect(await readFile(path.join(game, backups[0]), "utf8")).toBe("1. e4 e5 *\n");
  });

  it("rejects one of two conflicting replacements instead of silently choosing the last finisher", async () => {
    const responses = await Promise.all([upload("1. d4 d5 *\n"), upload("1. c4 e5 *\n")]);
    expect(
      responses.map((response) => response.status).sort(),
      "BUG: concurrent editors both receive 200 although one silently overwrites the other's verdict",
    ).toEqual([200, 409]);
  });

  it("schreibt ueber den Treuhaender statt die lebende Wahrheit an Ort und Stelle", async () => {
    const source = await readFile(path.join(process.cwd(), "app", "api", "pgn", "[name]", "route.ts"), "utf8");
    expect(
      source,
      "BUG: a kill during writeFile(reference.pgn) can leave the only human reference half-written",
    ).toMatch(/writeFileAtomicGuarded\(/);
  });

  // `keepCopy` las jeden `stat`-Fehler auf einem Sicherungsnamen als „frei".
  it("ein EACCES auf den Sicherungsnamen ersetzt das menschliche PGN nicht", async () => {
    fail.on = (op, file) => (op === "stat" && file.includes("reference.pgn.bak.") ? "EACCES" : null);
    const res = await upload("1. d4 d5 *\n");
    expect(res.status).not.toBe(200);
    expect(JSON.stringify(await res.json())).toMatch(/EACCES/);
  });

  // `stampOf` gab bei JEDEM Fehler `null`: der Upload lief ohne `replace=1` und ohne Sicherung ueber das PGN.
  it("ein EMFILE am Stempel ist kein „noch keine reference.pgn\"", async () => {
    const pgn = path.join(game, "reference.pgn");
    fail.on = (op, file) => (op === "stat" && file === pgn ? "EMFILE" : null);
    expect((await upload("1. d4 d5 *\n", false)).status).not.toBe(200);
    fail.on = null;
    expect(await readFile(pgn, "utf8")).toBe("1. e4 e5 *\n");
    expect((await readdir(game)).filter((f) => f !== "reference.pgn")).toEqual([]);
  });

  it("fehlt die Datei, ist der Stempel `null`", async () => {
    expect(await stampOf(path.join(game, "nope"))).toBeNull();
  });
});
