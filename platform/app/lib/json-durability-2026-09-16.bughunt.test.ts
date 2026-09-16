/**
 * Vier Stellen, die JSON/JSONL anders beantworten als `lib/jsonl.ts` und `lib/serialize.ts` es
 * heute festlegen: der zurueckgeschriebene Schwanz, der Fehler als Leerstand, der Schluessel ohne
 * Groesse und der Schreiber ohne Zwischenstufe.
 */
import { mkdir, readFile, utimes } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";

const realWrite = (await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises")).writeFile;
/** Der Schreiber, den die Produktion sieht — je Test umgehaengt, sonst der echte. */
let onWrite: typeof realWrite = realWrite;

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return { ...actual, default: actual, writeFile: (...args: Parameters<typeof realWrite>) => onWrite(...args) };
});

const { flagFrame } = await import("@/lib/frame-flag");
const { readJsonl } = await import("@/lib/jsonl");
const { readUseless, setUseless } = await import("@/lib/useless");
const { storedFit } = await import("@/lib/stored");
const { appendReviewNotes, dropReviewNotes, reviewNotesPath } = await import("@/lib/review-notes");
const { tempDataRoot, writeSession } = await import("@/lib/test-fixtures");

const NAME = "2026-09-16-10-00-00";
let root: string;
let dir: string;

beforeEach(async () => {
  onWrite = realWrite;
  root = await tempDataRoot("jsondur");
  dir = await writeSession({
    root,
    name: NAME,
    fps: 30,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [{ frame: 100 }, { frame: 200 }, { frame: 300 }],
  });
});

/**
 * 1 — die halbe letzte Zeile. `realgames.py` stroemt in `log.jsonl`; wer waehrend des Exports
 * flaggt, findet seinen Stem oben, bricht die Schleife ab und schreibt die Datei aus `lines`
 * zurueck — mit `"\n"` hinter der halben Zeile. Aus `tail` wird damit `corrupt`, dauerhaft.
 */
test("flagFrame macht aus dem erwartbaren Schwanz keine dauerhafte Beschaedigung", async () => {
  const file = path.join(dir, "log.jsonl");
  await realWrite(file, (await readFile(file, "utf8")) + '{"frame":"frames/000400.png","ply":2,"fe', "utf8");
  const before = await readFile(file, "utf8");
  expect(readJsonl(before)).toMatchObject({ tail: true, corrupt: 0 });

  await flagFrame(NAME, "000100", true).catch(() => {});
  expect(readJsonl(await readFile(file, "utf8")).corrupt).toBe(0);
});

/**
 * 5 — ein `catch`, das den Fehler zum Leerstand macht. `loadMeta` nebenan trennt ENOENT vom Rest,
 * seit ein Lesen-aendern-Schreiben auf `{}` ein gesetztes `archived` mitnahm. `readUseless` faengt
 * alles: eine kaputte `useless.json` liest sich als "nie geflaggt", die Kette laeuft wieder, und
 * der Widerruf faellt lautlos aus (`if (!current) return null`) — mit 200.
 */
test("eine unlesbare useless.json ist nicht dasselbe wie keine", async () => {
  const file = path.join(dir, "useless.json");
  await realWrite(file, '{"at":"2026-09-16T10:00:00Z", "rea', "utf8");
  await expect(readUseless(NAME)).rejects.toThrow();
  await expect(setUseless(NAME, false)).rejects.toThrow();
  // Und eine fehlende Datei bleibt, was sie war: nichts.
  expect(await readUseless("nicht-da-2026-01-01-00-00-00").catch(() => "warf")).toBeNull();
});

/**
 * 6 — mtime-Cache ohne Groesse. Jede andere Stelle dieser App schluesselt auf `mtimeMs:size`;
 * `lib/stored.ts` nimmt nur die mtime. Ein `fit-stored`-Lauf schreibt `quad-fit.json` neu, und
 * wenn die mtime steht (gleiche Millisekunde, oder eine Kopie mit erhaltenen Zeitstempeln),
 * serviert der Cache die alten Ecken — jeder Crop dieser Sitzung sitzt daneben.
 */
test("der Fit-Cache haengt nicht allein an der mtime", async () => {
  const session = path.join(dir, "files", "sessions", "s1");
  await mkdir(session, { recursive: true });
  const file = path.join(session, "quad-fit.json");
  // Dieselbe mtime von Hand gesetzt — das ist die zweite Schreibung in derselben Millisekunde,
  // nur reproduzierbar. Die GROESSE unterscheidet die beiden Staende, der Schluessel sieht sie nicht.
  const stamp = new Date("2026-09-16T10:00:00.000Z");
  await realWrite(file, JSON.stringify({ margin: 0.045, frames: {} }), "utf8");
  await utimes(file, stamp, stamp);
  expect((await storedFit(session))!.margin).toBe(0.045);

  await realWrite(file, JSON.stringify({ margin: 0.0, frames: { "000100": { corners: [], align_worst_px: 1 } } }), "utf8");
  await utimes(file, stamp, stamp);
  expect((await storedFit(session))!.margin).toBe(0.0);
});

/**
 * 2 — Schreiben ohne Zwischenstufe. `dropReviewNotes` schreibt das GLOBALE Ledger mit einem
 * blanken `writeFile` neu: der Aufruf kuerzt zuerst. Bricht er dann ab, sind die Urteile aller
 * Sitzungen halb da — `writeConfirmation` und `flagFrame` daneben gehen deshalb ueber tmp+rename.
 */
test("ein abgebrochener Widerruf laesst das Ledger ganz", async () => {
  await appendReviewNotes([
    { session_id: NAME, frame: "000100", verdict: "matte-ok" },
    { session_id: NAME, frame: "000200", verdict: "matte-ok" },
  ]);
  const file = reviewNotesPath();
  const whole = await readFile(file, "utf8");

  onWrite = (async (target: Parameters<typeof realWrite>[0], data: Parameters<typeof realWrite>[1]) => {
    await realWrite(target, String(data).slice(0, 20), "utf8");
    throw new Error("ENOSPC");
  }) as typeof realWrite;
  await dropReviewNotes([{ session_id: NAME, frame: "000100", verdict: "matte-ok" }]).catch(() => {});
  onWrite = realWrite;

  expect(await readFile(file, "utf8")).toBe(whole);
});

/** Und der Riegel darf durch den Fehler nicht stecken bleiben. */
test("nach dem Abbruch schreibt der naechste Widerruf wieder", async () => {
  await appendReviewNotes([{ session_id: NAME, frame: "000100", verdict: "matte-ok" }]);
  expect(await dropReviewNotes([{ session_id: NAME, frame: "000100", verdict: "matte-ok" }])).toBe(1);
  expect(await readFile(reviewNotesPath(), "utf8")).toBe("");
});
