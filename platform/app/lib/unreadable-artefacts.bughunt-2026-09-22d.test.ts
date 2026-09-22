/**
 * „Nicht da" und „da, aber unlesbar" sind nicht dasselbe. Ein kaputtes `split.json` machte den
 * Datensatz zu einem „ohne split.json" — die Meldung ist sachlich falsch, die Datei liegt da.
 * Gemessen 2026-09-22: 43 gueltige `split.json`, 18 Pack-Zusammenfassungen, 20 Perf-Dateien mit
 * 22 Laeufen, also heute kein Fall — die Form ist trotzdem gebaut.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { listDatasets, loadDatasetMeta } from "@/lib/corpus";
import { listPacks } from "@/lib/packs";
import { loadPerf } from "@/lib/perf";
import { tempDataRoot } from "@/lib/test-fixtures";

let root = "";
beforeEach(async () => {
  root = await tempDataRoot("unreadable-2026-09-22d");
});

async function dataset(name: string, files: Record<string, string>): Promise<void> {
  const dir = path.join(root, "datasets", name);
  await mkdir(dir, { recursive: true });
  for (const [file, text] of Object.entries(files)) await writeFile(path.join(dir, file), text);
}

test("ein FEHLENDES split.json bleibt eine Eigenschaft des Datensatzes", async () => {
  await dataset("ohne", {});
  await dataset("mit", { "split.json": JSON.stringify({ classes: ["wP"] }) });
  const seen = await listDatasets();
  expect(seen.map((d) => [d.name, d.split === null])).toEqual([
    ["mit", false],
    ["ohne", true],
  ]);
});

test("ein KAPUTTES split.json ist eine Stoerung, kein Datensatz ohne Split", async () => {
  await dataset("kaputt", { "split.json": '{"classes": [' });
  await expect(listDatasets()).rejects.toThrow();
});

test("ein unlesbares split.json wird nicht zu 'ohne split.json'", async () => {
  await mkdir(path.join(root, "datasets", "sperrig", "split.json"), { recursive: true });
  await expect(listDatasets()).rejects.toThrow();
});

test("eine unlesbare dataset.yaml wird nicht zu classMode null", async () => {
  await dataset("leer", {});
  expect(await loadDatasetMeta("leer")).toEqual({ classMode: null });

  await mkdir(path.join(root, "datasets", "sperrig", "dataset.yaml"), { recursive: true });
  await expect(loadDatasetMeta("sperrig")).rejects.toThrow();
});

test("eine kaputte summary.json macht den Pack nicht unsichtbar", async () => {
  const dir = path.join(root, "recordings", "rg-2026-09-22-00-00-00", "training-pack");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "summary.json"), "{ nicht json");
  await expect(listPacks()).rejects.toThrow();
});

test("eine kaputte Perf-Datei wird nicht zu null Laeufen weggefiltert", async () => {
  const dir = path.join(root, "reports", "perf");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "gut.json"), JSON.stringify({ model: "m", pack: "p", crops: 1 }));
  expect((await loadPerf()).map((f) => f.file)).toEqual(["gut.json"]);

  await writeFile(path.join(dir, "kaputt.json"), "{");
  await expect(loadPerf()).rejects.toThrow();
});

test("ein fehlendes Verzeichnis bleibt die leere Liste", async () => {
  expect(await listDatasets()).toEqual([]);
  expect(await listPacks()).toEqual([]);
  expect(await loadPerf()).toEqual([]);
});
