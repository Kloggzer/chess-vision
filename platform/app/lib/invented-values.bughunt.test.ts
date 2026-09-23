/** Codex 2026-09-15: vier Stellen machten aus einem Fehler einen plausiblen Normalwert ("30 fps", "nichts da"). */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("invented");
});

/** Ein Verzeichnis dort, wo eine Datei erwartet wird: `readFile` wirft EISDIR, nicht ENOENT. */
async function dirWhereFileBelongs(...parts: string[]) {
  await mkdir(path.join(root, ...parts), { recursive: true });
}

test("eine fehlende Bildrate wird nicht zu 30 erfunden", async () => {
  const { loadSession } = await import("@/lib/session-store/session");
  // Aufnahmen laufen zwischen 14,8 und 30,0 fps; 30 als Vorgabe verfaelscht `sinceS`/`toS` unauffaellig.
  await writeSession({
    root, fps: null,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [{ frame: 110, fen: "x" }],
  });

  await expect(loadSession("g")).rejects.toThrow(/fps/i);
});

test("ein unlesbares Ledger ist nicht dasselbe wie keine Urteile", async () => {
  const { decidedKeys } = await import("@/lib/session-store/corrections");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  await dirWhereFileBelongs("recordings", "g", "corrections.jsonl");

  await expect(decidedKeys("g")).rejects.toThrow();
});

test("ein kaputtes Aufnahme-Wurzelverzeichnis ist nicht ein leeres Projekt", async () => {
  const { listGames } = await import("@/lib/session-store/recordings");
  // Eine DATEI namens `recordings`: `readdir` wirft ENOTDIR, die Startseite zeigte "keine Aufnahmen".
  await writeFile(path.join(root, "recordings"), "", "utf8");

  await expect(listGames()).rejects.toThrow();
});

test("eine unlesbare position-flags ist nicht `nie gelaufen`", async () => {
  const { loadPositionFlags } = await import("@/lib/reports/position-flags");
  await dirWhereFileBelongs("reports", "position-flags.jsonl");

  await expect(loadPositionFlags()).rejects.toThrow();
});
