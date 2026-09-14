import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/pgn/[name]/route";

const GAME = "proof-game";

describe("POST /api/pgn/[name] data-safety regressions", () => {
  let root: string;
  let game: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "chesslab-pgn-route-"));
    game = path.join(root, "recordings", GAME);
    await mkdir(game, { recursive: true });
    process.env.CHESSLAB_DATA_DIR = root;
  });

  afterEach(async () => {
    delete process.env.CHESSLAB_DATA_DIR;
    await rm(root, { recursive: true, force: true });
  });

  const replace = (pgn: string) =>
    POST(new Request(`http://local/api/pgn/${GAME}?replace=1`, { method: "POST", body: pgn }), {
      params: Promise.resolve({ name: GAME }),
    });

  it("keeps a recovery copy before overwriting the human reference PGN", async () => {
    const original = "1. e4 e5 *\n";
    await writeFile(path.join(game, "reference.pgn"), original, "utf8");

    expect((await replace("1. d4 d5 *\n")).status).toBe(200);

    const backups = (await readdir(game)).filter((name) => name.startsWith("reference.pgn.bak"));
    expect(
      backups,
      "BUG: replacing reference.pgn destroys the last human truth without any recovery copy",
    ).not.toHaveLength(0);
    expect(await readFile(path.join(game, backups[0]), "utf8")).toBe(original);
  });

  it("rejects one of two conflicting replacements instead of silently choosing the last finisher", async () => {
    await writeFile(path.join(game, "reference.pgn"), "1. e4 e5 *\n", "utf8");

    const responses = await Promise.all([replace("1. d4 d5 *\n"), replace("1. c4 e5 *\n")]);

    expect(
      responses.map((response) => response.status).sort(),
      "BUG: concurrent editors both receive 200 although one silently overwrites the other's verdict",
    ).toEqual([200, 409]);
  });

  it("uses a sibling temporary file and atomic rename rather than writing the live truth in place", async () => {
    const source = await readFile(path.join(process.cwd(), "app", "api", "pgn", "[name]", "route.ts"), "utf8");

    expect(
      source,
      "BUG: a kill during writeFile(reference.pgn) can leave the only human reference half-written",
    ).toMatch(/writeFile\([^,]*\.tmp[\s\S]*rename\(/);
  });
});
