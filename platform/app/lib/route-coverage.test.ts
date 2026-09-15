import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * Eine Ratsche auf die API-Routen, das duennste Stueck des Baums (18,6 % am 2026-09-14) und der
 * Weg, an dem der Handy-Transfer haengt. `route-coverage.txt` listet, was heute keinen Test hat,
 * und darf nur schrumpfen — die Gesamtzahl waere das falsche Mass (`core-engine` stand bei 92 %
 * und trug vier Stellungs-Fehler).
 */
const APP = process.cwd();

async function filesUnder(dir: string, name: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
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
    const text = await readFile(file, "utf8");
    for (const m of text.matchAll(/"@\/app\/(.+?)\/route"/g)) tested.add(m[1]);
  }
  const budget = (await readFile(path.join(APP, "route-coverage.txt"), "utf8"))
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  return { routes, tested, budget: new Set(budget) };
}

test("no route loses its test, and no new route arrives without one", async () => {
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
