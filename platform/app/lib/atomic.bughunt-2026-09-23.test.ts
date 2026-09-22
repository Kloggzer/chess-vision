/**
 * `stampOf` gab bei JEDEM Fehler `null`, also „keine Datei". Ein EMFILE auf einer vorhandenen
 * `reference.pgn` liess den Upload ohne `replace=1` und ohne Sicherung ueber das menschliche PGN.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EMFILE: ${file}`), { code: "EMFILE" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

test("ein EMFILE am Stempel ist kein „noch keine reference.pgn\"", async () => {
  const game = path.join(await tempDataRoot("stamppgn"), "recordings", "g");
  await mkdir(game, { recursive: true });
  const pgn = path.join(game, "reference.pgn");
  await writeFile(pgn, "1. e4 e5 *\n", "utf8");
  fail.on = (file) => file === pgn;
  const { POST } = await import("@/app/api/pgn/[name]/route");
  const res = await POST(new Request("http://local/api/pgn/g", { method: "POST", body: "1. d4 d5 *\n" }), {
    params: Promise.resolve({ name: "g" }),
  });
  expect(res.status).not.toBe(200);
  expect(await readFile(pgn, "utf8")).toBe("1. e4 e5 *\n");
  expect((await readdir(game)).filter((f) => f !== "reference.pgn")).toEqual([]);
});

test("fehlt die Datei, ist der Stempel `null`", async () => {
  const root = await tempDataRoot("stampnone");
  expect(await (await import("@/lib/atomic")).stampOf(path.join(root, "nope"))).toBeNull();
});
