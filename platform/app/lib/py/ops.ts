/** Die reinen Ops des Workers, getypt — Daten rein, Daten raus, keine Platte. */
import { pyCall } from "@/lib/py/worker";

/** `realgames.confirm.lcs_report`: `[truth index, candidate index]`, TRUTH rueckt beim Gleichstand vor. */
export type LcsReport = { matched: [number, number][]; invented: number[]; missed: number[] };

/** `session_store.recording.parse_reference`: die erste Partie; `problem`, wenn sie nicht lesbar ist. */
export type Reference = { sans: string[] | null; problem: string | null; more: number };

export type MoveSquares = { from: string; to: string };

export const lcsReport = (truth: string[], cand: string[]): Promise<LcsReport> =>
  pyCall<LcsReport>("lcs_report", { truth, cand });

export const reviewedPlies = (moves: { ply: number }[], matched: [number, number][], kept: number[]): Promise<number[]> =>
  pyCall<number[]>("reviewed_plies", { moves, matched, kept });

export const parseReference = (text: string): Promise<Reference> => pyCall<Reference>("parse_reference", { text });

/** `[FEN davor, SAN]` je Halbzug -> die Felder des Pfeils, `null` wo der Zug dort nicht spielbar ist. */
export const moveSquares = (plies: [string | null, string][]): Promise<(MoveSquares | null)[]> =>
  plies.length === 0 ? Promise.resolve([]) : pyCall<(MoveSquares | null)[]>("move_squares", { plies });
