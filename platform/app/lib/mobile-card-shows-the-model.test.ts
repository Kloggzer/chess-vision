/**
 * Die Handy-Karte zeigt EINE Zelle. Ohne das Wort des Modells und die Soll-Figur daneben
 * beantwortet der Mensch "widerspricht das Modell der FEN?" ohne zu wissen, WAS es behauptet
 * (Nutzer, 2026-09-17: "ich sehe nicht was es sein sollte und was das Modell vorschlägt").
 *
 * Quelltext-Ratsche, weil dieses Projekt keine Render-Umgebung hat (`environment: "node"`).
 * Sie prueft den GESCHWEIFTEN Ausdruck, nicht das blosse Vorkommen: ein Feld, das nur noch in
 * der Logik erwaehnt wird, waehrend die Anzeige weg ist, war der Zustand, den sie fangen soll.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const CARD = path.join(__dirname, "..", "app", "strom", "labeln", "mobile-sort.tsx");

/** Ein JSX-Ausdruck `{head.<feld>...}` — Kommentare zaehlen nicht mit. */
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
  // Genau der Zustand von vorher: die Vorgaenger-Fassung suchte `head.note` als Zeichenkette und
  // blieb gruen, waehrend die Anzeige verschwand. Hier faellt sie.
  const gutted = source.replace(/\{\s*head\.exception\b[^}]*\}/g, '"—"') + "\n// head.exception\n";

  expect(gutted).toContain("head.exception");
  expect(rendersField(gutted, "exception")).toBe(false);
});
