/**
 * Vier Stellen erfinden aus einem Fehler einen plausiblen Normalwert, den nachgelagert niemand
 * mehr als erfunden erkennt: eine fehlende Bildrate wird zu 30, eine unlesbare Datei zu "es gibt
 * nichts". `present: false` und eine leere Liste sind aber AUSSAGEN — die Lane zeigt "nie
 * gelaufen", wo in Wahrheit ein Lesefehler stand. Gefunden von Codex, 2026-09-15.
 */
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chesslab-invented-"));
  process.env.CHESSLAB_DATA_DIR = root;
});

/** Ein Verzeichnis dort, wo eine Datei erwartet wird: `readFile` wirft EISDIR, nicht ENOENT. */
async function dirWhereFileBelongs(...parts: string[]) {
  await mkdir(path.join(root, ...parts), { recursive: true });
}

test("eine fehlende Bildrate wird nicht zu 30 erfunden", async () => {
  const { loadSession } = await import("@/lib/session");
  const dir = path.join(root, "recordings", "g");
  await mkdir(dir, { recursive: true });
  // Aufnahmen auf dieser Platte laufen zwischen 14,8 und 30,0 fps; 30 als Vorgabe verdoppelt
  // `sinceS`/`toS` fuer jede Handy-Aufnahme, und die Sekundenangabe sieht dabei normal aus.
  await writeFile(path.join(dir, "candidate.json"), JSON.stringify({
    name: "g", geometry: { board_size: 928 },
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  }), "utf8");
  await writeFile(path.join(dir, "log.jsonl"),
    JSON.stringify({ frame: "frames/000110.png", ply: 1, fen: "x", corners: [] }) + "\n", "utf8");

  await expect(loadSession("g")).rejects.toThrow(/fps/i);
});

test("ein unlesbares Ledger ist nicht dasselbe wie keine Urteile", async () => {
  const { decidedKeys } = await import("@/lib/corrections");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  await dirWhereFileBelongs("recordings", "g", "corrections.jsonl");

  await expect(decidedKeys("g")).rejects.toThrow();
});

test("ein kaputtes Aufnahme-Wurzelverzeichnis ist nicht ein leeres Projekt", async () => {
  const { listGames } = await import("@/lib/data");
  // Eine DATEI namens `recordings`: `readdir` wirft ENOTDIR. Heute rendert die Startseite
  // daraufhin "keine Aufnahmen" — der Nutzer sieht ein leeres Projekt statt eines Fehlers.
  await writeFile(path.join(root, "recordings"), "", "utf8");

  await expect(listGames()).rejects.toThrow();
});

test("eine unlesbare position-flags ist nicht `nie gelaufen`", async () => {
  const { loadPositionFlags } = await import("@/lib/position-flags");
  await dirWhereFileBelongs("reports", "position-flags.jsonl");

  await expect(loadPositionFlags()).rejects.toThrow();
});

