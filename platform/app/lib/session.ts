/**
 * The exported session (`data/sessions/rg-<name>/`, phase 01) as the relabel views need it:
 * one row per FRAME with its ply, its FEN and its own corner quad.
 *
 * Read paths are mtime-keyed (CLAUDE.md: never re-read a whole manifest per request) — the log
 * of a 10 000-frame video is ~2 MB and every crop request would otherwise parse it again.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { checkName, dataDir, loadCandidate } from "@/lib/data";
import type { CropParams } from "@/lib/warp";

export type SessionRow = { stem: string; ply: number; fen: string; corners: number[][] };
export type Session = {
  name: string;
  sessionId: string;
  rows: SessionRow[];
  byStem: Map<string, SessionRow>;
  plies: Map<number, string[]>;
  boardSize: number;
  margin: number | number[];
  crop: CropParams;
  whitePov: boolean;
};

export function sessionId(name: string): string {
  return `rg-${checkName(name, "game name")}`;
}

export function sessionDir(name: string): string {
  return path.join(dataDir(), "sessions", sessionId(name));
}

export function framePath(name: string, stem: string): string {
  return path.join(sessionDir(name), "frames", `${checkName(stem, "frame")}.png`);
}

const cache = new Map<string, { key: number; value: Session }>();

/** Log + the candidate's geometry block — the two files the crops are cut from. */
export async function loadSession(name: string): Promise<Session> {
  const log = path.join(sessionDir(name), "log.jsonl");
  const key = (await stat(log)).mtimeMs;
  const hit = cache.get(name);
  if (hit?.key === key) return hit.value;

  const rows: SessionRow[] = [];
  for (const line of (await readFile(log, "utf8")).split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { frame: string; ply: number; fen: string; corners: number[][] };
    rows.push({
      stem: path.basename(row.frame, ".png"),
      ply: row.ply,
      fen: row.fen,
      corners: row.corners,
    });
  }
  const candidate = await loadCandidate(name);
  const geometry = candidate.geometry ?? {};
  const source = candidate.source ?? {};
  const value: Session = {
    name,
    sessionId: sessionId(name),
    rows,
    byStem: new Map(rows.map((r) => [r.stem, r])),
    plies: rows.reduce((m, r) => m.set(r.ply, [...(m.get(r.ply) ?? []), r.stem]), new Map()),
    boardSize: geometry.board_size ?? 928,
    margin: geometry.margin ?? 0,
    crop: { pad_up: source.crop?.pad_up ?? 0, pad_side: source.crop?.pad_side ?? 0.05 },
    whitePov: true,
  };
  cache.set(name, { key, value });
  return value;
}

