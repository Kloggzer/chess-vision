/** Die Handy-Karte muss Soll-Figur und Modellwort ZEIGEN (Nutzer, 2026-09-17). Quelltext-Ratsche
 *  ohne Render-Umgebung: geprueft wird der geschweifte JSX-Ausdruck, nicht das blosse Vorkommen. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const CARD = path.join(__dirname, "..", "app", "strom", "labeln", "mobile-sort.tsx");

function rendersField(source: string, field: string): boolean {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return new RegExp(String.raw`\{\s*head\.${field}\b[^}]*\}`).test(code);
}

const SHOWN = [
  ["fen_label", "was auf dem Feld stehen SOLL"],
  ["exception", "was das Modell stattdessen liest"],
  ["note", "warum die Zelle strittig ist"],
] as const;

test.each(SHOWN)("die Handy-Karte zeigt `%s` (%s)", async (field) => {
  expect(rendersField(await readFile(CARD, "utf8"), field)).toBe(true);
});

test("die Ratsche faellt, wenn die Anzeige weicht und nur die Erwaehnung bleibt", async () => {
  const source = await readFile(CARD, "utf8");
  const gutted = source.replace(/\{\s*head\.exception\b[^}]*\}/g, '"—"') + "\n// head.exception\n";

  expect(gutted).toContain("head.exception");
  expect(rendersField(gutted, "exception")).toBe(false);
});
