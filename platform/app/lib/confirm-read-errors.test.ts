/**
 * `/confirm/<name>` las jeden Fehler auf `candidate.json` als „keine Datei" und bot den Replay an,
 * der sie samt Bestaetigungen neu schreibt; ein Fehler auf `reference.pgn` gab dem Editor "".
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string, rest: unknown[]) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    readFile: (file: string, ...rest: unknown[]) => {
      const code = fail.on?.(String(file), rest) ?? null;
      if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
      return (real.readFile as (...a: unknown[]) => unknown)(file, ...rest);
    },
  };
});

beforeEach(() => {
  fail.on = null;
});

const PAGE_TIMEOUT = 30_000;
const confirmPage = async () =>
  (await import("@/app/confirm/[name]/page")).default({ params: Promise.resolve({ name: "g" }) } as never);

function propsWith(node: ReactNode, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) node.forEach((n) => propsWith(n, key, out));
  else if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (key in props) out.push(props[key]);
    propsWith(props.children as ReactNode, key, out);
  }
  return out;
}

const confirmedSession = async (prefix: string) =>
  writeSession({ root: await tempDataRoot(prefix), candidate: { confirmed: true, reviewed_plies: [1] } });

const isNoCandidate = (node: unknown) => isValidElement(node) && (node.type as { name?: string }).name === "NoCandidate";

test("/confirm/<name>: ein EACCES auf candidate.json ist nicht „Keine candidate.json\"", async () => {
  const dir = await confirmedSession("cre-cand-eacces");
  const candidate = path.join(dir, "candidate.json");
  fail.on = (file) => (path.resolve(file) === path.resolve(candidate) ? "EACCES" : null);
  await expect(confirmPage()).rejects.toThrow(/EACCES/);
}, PAGE_TIMEOUT);

test("/confirm/<name>: eine halb geschriebene candidate.json ist auch nicht „keine\"", async () => {
  const dir = await confirmedSession("cre-cand-torn");
  await writeFile(path.join(dir, "candidate.json"), '{"confirmed": true, "revi', "utf8");
  await expect(confirmPage()).rejects.toThrow(SyntaxError);
}, PAGE_TIMEOUT);

test("/confirm/<name>: nur eine FEHLENDE candidate.json fuehrt zum Replay-Angebot", async () => {
  const root = await tempDataRoot("cre-cand-absent");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  expect(isNoCandidate(await confirmPage())).toBe(true);
}, PAGE_TIMEOUT);

test("/confirm/<name>: ein Lesefehler auf reference.pgn gibt dem Editor keine leere Referenz", async () => {
  const dir = await confirmedSession("cre-ref-eacces");
  const pgn = path.join(dir, "reference.pgn");
  await writeFile(pgn, "1. e4 e5 *\n", "utf8");
  // Erst der Editor-Lesevorgang faellt: `readReference` und `referenceOrigin` lesen vor ihm.
  let reads = 0;
  fail.on = (file) => (path.resolve(file) === path.resolve(pgn) && ++reads === 3 ? "EACCES" : null);
  await expect(confirmPage()).rejects.toThrow(/EACCES/);
}, PAGE_TIMEOUT);

test("/confirm/<name>: ohne Fehler bekommt der Editor den echten Text", async () => {
  const dir = await confirmedSession("cre-ref-ok");
  await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 *\n", "utf8");
  expect(propsWith(await confirmPage(), "text")).toEqual(["1. e4 e5 *\n"]);
}, PAGE_TIMEOUT);
