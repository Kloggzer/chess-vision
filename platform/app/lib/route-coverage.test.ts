import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { expect, onTestFinished, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";
import { routeImportsIn } from "@/ratchet-detect";

/** Ratsche auf die API-Routen (18,6 % am 2026-09-14, der Handy-Weg): `route-coverage.txt` darf nur
 *  schrumpfen — die Gesamtabdeckung waere das falsche Mass (`core-engine`: 92 % und vier Fehler). */
const APP = process.cwd();

// Ohne die Sperre fand der Gang 322 Testdateien in `node_modules`, die Routen als getestet auswiesen.
async function filesUnder(dir: string, name: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(full, name)));
    else if (entry.name === name || entry.name.endsWith(name)) out.push(full);
  }
  return out;
}

const slug = (file: string) =>
  path.relative(path.join(APP, "app"), path.dirname(file)).split(path.sep).join("/");

async function state() {
  const routes = (await filesUnder(path.join(APP, "app"), "route.ts")).map(slug).sort();
  const tested = new Set<string>();
  for (const file of await filesUnder(APP, ".test.ts")) {
    for (const route of routeImportsIn(await readFile(file, "utf8"))) tested.add(route);
  }
  const budget = (await readFile(path.join(APP, "route-coverage.txt"), "utf8"))
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  return { routes, tested, budget: new Set(budget) };
}

test("no route loses its test, and no new route arrives without one", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const { routes, tested, budget } = await state();
  const untested = routes.filter((r) => !tested.has(r));

  const added = untested.filter((r) => !budget.has(r));
  expect(added, "neue Route ohne Test — schreib ihn, oder trag sie bewusst ein").toEqual([]);

  const regressed = [...budget].filter((r) => tested.has(r));
  expect(
    regressed,
    `getestet, aber noch in route-coverage.txt — Zeile streichen: ${regressed.join(", ")}`,
  ).toEqual([]);

  const gone = [...budget].filter((r) => !routes.includes(r));
  expect(gone, `Route existiert nicht mehr, Zeile streichen: ${gone.join(", ")}`).toEqual([]);
});

/** Gegenprobe: eine eingepflanzte Fremddatei darf die Abdeckung nicht erfinden. */
test("der Gang ueberspringt node_modules und Punktverzeichnisse", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const base = path.join(tmpdir(), `rc-${Date.now()}`);
  onTestFinished(() => rm(base, { recursive: true, force: true }));
  for (const rel of ["node_modules/fremd", ".next/cache", "lib"]) {
    await mkdir(path.join(base, rel), { recursive: true });
    await writeFile(path.join(base, rel, "x.test.ts"), '"@/app/api/erfunden/route"', "utf8");
  }

  const gefunden = await filesUnder(base, ".test.ts");

  expect(gefunden.map((f) => path.relative(base, f).split(path.sep).join("/")))
    .toEqual(["lib/x.test.ts"]);
});
