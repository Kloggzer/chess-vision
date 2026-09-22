/**
 * `stat` scheitert nicht nur mit ENOENT — EMFILE kommt, wenn die Strom-Seite ueber 40 Aufnahmen
 * faechert. Beide Leser schnitten den Stempel-Fehler auf "keine Datei" ab und sprangen damit an
 * ihrem eigenen ENOENT-Griff vorbei: die Matte war leer, die unbrauchbaren Zellen waren weg.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let root: string;

const emfile = () => Object.assign(new Error("EMFILE: too many open files"), { code: "EMFILE" });

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "stat-emfile-"));
  process.env.CHESSLAB_DATA_DIR = root;
  vi.resetModules();
  vi.doMock("node:fs/promises", async () => {
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    return {
      ...actual,
      stat: (file: Parameters<typeof actual.stat>[0]) =>
        String(file).endsWith(".jsonl") ? Promise.reject(emfile()) : actual.stat(file),
    };
  });
});

afterEach(async () => {
  vi.doUnmock("node:fs/promises");
  vi.resetModules();
  await rm(root, { recursive: true, force: true });
});

async function recording(name: string): Promise<string> {
  const dir = path.join(root, "recordings", name);
  await mkdir(dir, { recursive: true });
  return dir;
}

test("ein EMFILE auf matte.jsonl ist keine leere Matte", async () => {
  const dir = await recording("g");
  await writeFile(path.join(dir, "matte.jsonl"), `${JSON.stringify({ frame: "000010", coverage: { e4: 0.9 } })}\n`, "utf8");
  const { loadMatte } = await import("@/lib/matte");
  await expect(loadMatte("g")).rejects.toMatchObject({ code: "EMFILE" });
});

test("ein EMFILE auf unusable-cells.jsonl holt keine abgehakte Zelle zurueck", async () => {
  const dir = await recording("rg-2026-09-22-00-00-00");
  await writeFile(
    path.join(dir, "unusable-cells.jsonl"),
    `${JSON.stringify({ session_id: "2026-09-22-00-00-00", frame: "000010", square: "e4", unusable: true })}\n`,
    "utf8",
  );
  const { unusableCells } = await import("@/lib/unusable-cells");
  await expect(unusableCells("rg-2026-09-22-00-00-00")).rejects.toMatchObject({ code: "EMFILE" });
});

test("ein EMFILE auf log.jsonl meldet keinen erledigten Matte-Stapel", async () => {
  const dir = await recording("g2");
  await writeFile(path.join(dir, "matte.jsonl"), "", "utf8");
  await writeFile(
    path.join(dir, "log.jsonl"),
    `${JSON.stringify({ board: "boards/000010.webp", dirty_reason: "occluded" })}\n`,
    "utf8",
  );
  const { matteCensus } = await import("@/lib/matte");
  await expect(matteCensus("g2")).rejects.toMatchObject({ code: "EMFILE" });
});
