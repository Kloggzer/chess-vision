import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { archivedAt, isArchived, loadMeta, saveMeta } from "@/lib/meta";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

// Ablehnen, nicht werfen: ein synchroner Wurf liefe am `catch` vorbei.
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    readFile: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.readFile as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

async function withGame(name = "g") {
  const root = await tempDataRoot("meta");
  await mkdir(path.join(root, "recordings", name), { recursive: true });
  return path.join(root, "recordings", name);
}

test("meta round-trips, patches merge, and empty values delete", async () => {
  await withGame();
  expect(await loadMeta("g")).toEqual({});
  await saveMeta("g", { title: "  Carlsen–Shevchenko  " });
  expect(await loadMeta("g")).toEqual({ title: "Carlsen–Shevchenko" });
  await saveMeta("g", { archived: true });
  expect(await loadMeta("g")).toEqual({ title: "Carlsen–Shevchenko", archived: true });
  await saveMeta("g", { title: "", archived: false });
  expect(await loadMeta("g")).toEqual({});
});

test("a title past the limit and a traversal name are refused", async () => {
  await withGame();
  await expect(saveMeta("g", { title: "x".repeat(200) })).rejects.toThrow("longer");
  await expect(saveMeta("../evil", { archived: true })).rejects.toThrow("bad game name");
});

// Zwei Archiv-Flaggen, zwei Besitzer: 2026-08-30-14-33-02 war in `session.yaml` archiviert, und
// die UI las nur ihre eigene Datei weiter — die Stichprobe zog daraus 404-Crops (2026-09-07).
test("the pipeline's own archived_at retires a game, without ui-meta.json", async () => {
  const dir = await withGame();
  expect(await archivedAt("g")).toBeNull();
  expect(await isArchived("g")).toBe(false);
  const stamp = "2026-08-30T12:51:10.723760+00:00";
  await writeFile(
    path.join(dir, "session.yaml"),
    ["session_id: 20260830-143302", `archived_at: '${stamp}'`, "notes: x", ""].join("\n"),
    "utf8",
  );
  expect(await archivedAt("g")).toBe(`'${stamp}'`);
  expect(await isArchived("g")).toBe(true);
  // Der Lese-Pfad der UI bleibt ihre eigene Datei — sonst schriebe `saveMeta` die fremde Flagge fest.
  expect(await loadMeta("g")).toEqual({});
});

test("a session.yaml without the stamp archives nothing", async () => {
  const dir = await withGame();
  await writeFile(path.join(dir, "session.yaml"), ["notes: nicht_archived_at", "mode: track", ""].join("\n"), "utf8");
  expect(await archivedAt("g")).toBeNull();
  expect(await isArchived("g")).toBe(false);
});

// Ein halb geschriebenes `ui-meta.json` las sich als `{}`, und ein Titel-Edit schrieb `archived` weg.
test("refuses to overwrite a ui-meta.json it could not read", async () => {
  const file = path.join(await withGame(), "ui-meta.json");
  await saveMeta("g", { archived: true });
  expect(await isArchived("g")).toBe(true);
  await writeFile(file, '{"archived": true, "titl', "utf8");

  await expect(
    saveMeta("g", { title: "Partie 7" }),
    "BUG: a corrupt file is read as {} and the archived flag is written away",
  ).rejects.toThrow();
  expect(await readFile(file, "utf8")).not.toBe('{\n  "title": "Partie 7"\n}\n');
});

// Als "nie archiviert" gelesen stand eine ausgemusterte Aufnahme (falsche FENs) wieder in der Label-Population.
test("ein EACCES auf session.yaml ist kein „nie archiviert\"", async () => {
  const dir = await withGame();
  await writeFile(path.join(dir, "session.yaml"), "archived_at: '2026-08-30'\n", "utf8");
  fail.on = (file) => file.endsWith("session.yaml");
  await expect(isArchived("g")).rejects.toThrow(/EACCES/);
});
