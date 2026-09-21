import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { appendUnusableCells, unusableCells, unusableCellsPath, validateCell } from "@/lib/unusable-cells";
import { tempDataRoot } from "@/lib/test-fixtures";

const NAME = "2026-09-14-11-00-00";
const ID = `rg-${NAME}`;
let data: string;

beforeEach(async () => {
  data = await tempDataRoot("unusable");
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
});

const cell = (square: string, unusable = true) => ({ session_id: ID, frame: "000100", square, unusable });

test("das Ledger liegt bei der Aufnahme, NICHT in corrections.jsonl", async () => {
  await appendUnusableCells([cell("e5")]);
  expect(unusableCellsPath(NAME)).toBe(path.join(data, "recordings", NAME, "unusable-cells.jsonl"));
  const rows = (await readFile(unusableCellsPath(NAME), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
  expect(rows[0]).toMatchObject({ session_id: ID, frame: "000100", square: "e5", unusable: true });
  expect(rows[0].ts).toMatch(/^\d{4}-\d\d-\d\dT/);
  // Die Zeile traegt KEIN `label` — wer dieses Ledger liest, erwartet keine Klasse.
  expect(rows[0]).not.toHaveProperty("label");
});

test("angehaengt wird, die letzte Zeile gewinnt — `unusable: false` nimmt zurueck", async () => {
  await appendUnusableCells([cell("e5"), cell("a1")]);
  expect([...(await unusableCells(NAME))].sort()).toEqual(["000100|a1", "000100|e5"]);
  await appendUnusableCells([cell("e5", false)]);
  expect([...(await unusableCells(NAME))]).toEqual(["000100|a1"]);
  // Zuruecknehmen loescht nichts: beide Urteile stehen weiter in der Datei.
  expect((await readFile(unusableCellsPath(NAME), "utf8")).trim().split("\n")).toHaveLength(3);
});

test("die Zeilen einer anderen Aufnahme zaehlen hier nicht mit", async () => {
  await appendUnusableCells([cell("e5")]);
  const other = path.join(data, "recordings", NAME, "unusable-cells.jsonl");
  const text = await readFile(other, "utf8");
  const { appendFile } = await import("node:fs/promises");
  await appendFile(other, JSON.stringify({ session_id: "rg-andere", frame: "000100", square: "h8", unusable: true }) + "\n");
  expect(text.length).toBeGreaterThan(0);
  expect([...(await unusableCells(NAME))]).toEqual(["000100|e5"]);
});

test("der Schreiber prueft, statt dem Browser zu glauben", () => {
  expect(() => validateCell({ session_id: ID, frame: "000100", square: "z9", unusable: true })).toThrow("z9");
  expect(() => validateCell({ session_id: "../../etc", frame: "000100", square: "e5" })).toThrow();
  expect(() => validateCell(null)).toThrow();
  // Ohne `unusable` ist die Zeile das Urteil selbst; nur das ausdrueckliche `false` nimmt zurueck.
  expect(validateCell({ session_id: ID, frame: "000100", square: "e5" }).unusable).toBe(true);
  expect(validateCell({ session_id: ID, frame: "000100", square: "e5", unusable: false }).unusable).toBe(false);
});

test("eine halb geschriebene Zeile ist kein Urteil und kippt das Ledger nicht", async () => {
  const { appendFile } = await import("node:fs/promises");
  await appendUnusableCells([cell("e5")]);
  // Ohne Umbruch dahinter: das ist der Schwanz eines laufenden `appendRows`, nicht Beschaedigung.
  await appendFile(unusableCellsPath(NAME), '{"session_id": "rg-');
  expect([...(await unusableCells(NAME))]).toEqual(["000100|e5"]);
});

/** Wie das Schwesterledger `review-notes.ts`: eine kaputte Zeile MITTENDRIN zu ueberspringen
 *  verliert ein Urteil lautlos, und die Zelle steht danach wieder in der Lane. */
test("eine kaputte Zeile mittendrin verliert kein Urteil lautlos", async () => {
  const { appendFile } = await import("node:fs/promises");
  await appendUnusableCells([cell("e5")]);
  await appendFile(unusableCellsPath(NAME), '{"session_id": "rg-\n');
  await expect(unusableCells(NAME)).rejects.toThrow(/beschaedigte/);
});
