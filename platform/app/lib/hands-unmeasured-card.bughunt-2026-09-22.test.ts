/**
 * `handsUnmeasured` sagt "auf dieser Aufnahme lief der Hand-Scan nie". Die Zell-Lane rechnet es
 * aus und legt es der Karte bei — `GridCell` kannte das Feld nicht, der Spread liess es still
 * durch, und eine leere Ecke las sich als gemessen-keine-Hand. Genau die Falle, die es verhindert.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (rel: string) => readFile(path.join(ROOT, rel), "utf8");

const FLAG = "handsUnmeasured";

test("die Lane legt die Marke bei", async () => {
  expect(await read("app/strom/labeln/cell-lane.tsx")).toContain(`${FLAG}: true`);
});

test("und die Karte kennt sie und zeigt sie", async () => {
  const grid = await read("components/crop-grid.tsx");
  expect(grid, "GridCell deklariert das Feld").toMatch(new RegExp(`${FLAG}\\??:\\s*boolean`));
  expect(grid, "und der Renderer liest es").toMatch(new RegExp(`cell\\.${FLAG}`));
});
