/**
 * `complete()` haengt aus nebenlaeufigen Anfragen an dieses Ledger an, eine halbe LETZTE Zeile ist
 * also erwartbar. Sie kostete bis 2026-09-16 die ganze Seite: ein `try` um das gesamte Lesen
 * machte aus einer abgeschnittenen Zeile "es gab nie einen Transfer".
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { transfers } from "@/lib/ingest";
import { tempDataRoot } from "@/lib/test-fixtures";

const LANDED = JSON.stringify({ name: "2026-09-01-10-00-00", status: "landed" });
const HALF = '{"name": "2026-09-02-10-00';

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("transfers");
  await mkdir(path.join(root, "inbox"), { recursive: true });
});

const ledger = (text: string) =>
  writeFile(path.join(root, "inbox", "transfers.jsonl"), text, "utf8");

test("die halbe LETZTE Zeile kostet ihre Zeile, nicht die ganze Seite", async () => {
  await ledger(`${LANDED}\n${HALF}`);

  const rows = await transfers();

  expect(rows.map((r) => r.name)).toEqual(["2026-09-01-10-00-00"]);
});

test("eine kaputte Zeile MITTENDRIN bleibt laut — die kann kein Schreiber erklaeren", async () => {
  await ledger(`${LANDED}\n${HALF}\n${LANDED}\n`);

  await expect(transfers()).rejects.toThrow();
});

test("eine fehlende Datei ist einfach leer", async () => {
  expect(await transfers()).toEqual([]);
});
