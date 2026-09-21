import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * Wer eine Karte VOR dem POST aus der Lane nimmt, muss sie beim Fehlschlag zurueckholen. Sonst
 * zeigt die Oberflaeche einen Erfolg, den der Server nie bestaetigt hat: das Frame (oder die ganze
 * Aufnahme) ist fuer den Rest der Sitzung weg, und auf der Platte steht kein Urteil.
 */
const HIDERS = ["setThrown", "setDropped", "setReported"] as const;

/** Die Funktionen der Datei, grob an ihrer Einrueckung geschnitten — Deklaration bis zur naechsten. */
function functions(source: string): { name: string; body: string }[] {
  const head = /^ {2}(?:(?:async )?function (\w+)|const (\w+) = useCallback)/gm;
  const marks = [...source.matchAll(head)].map((m) => ({ at: m.index, name: m[1] ?? m[2] }));
  return marks.map((m, i) => ({ name: m.name, body: source.slice(m.at, marks[i + 1]?.at ?? source.length) }));
}

test("jede optimistische Ausblendung in stream.tsx rollt im catch zurueck", async () => {
  const file = path.join(process.cwd(), "app", "strom", "labeln", "stream.tsx");
  const source = await readFile(file, "utf8");
  const offences: string[] = [];
  for (const { name, body } of functions(source)) {
    const tryAt = body.indexOf("try {");
    const catchAt = body.indexOf("catch (");
    if (tryAt < 0 || catchAt < tryAt) continue;
    if (!body.slice(tryAt, catchAt).includes("post(")) continue;
    for (const setter of HIDERS) {
      if (!body.slice(0, tryAt).includes(setter)) continue;
      if (!body.slice(catchAt).includes(setter)) offences.push(`${name}: ${setter} ohne Ruecknahme im catch`);
    }
  }
  expect(offences).toEqual([]);
});
