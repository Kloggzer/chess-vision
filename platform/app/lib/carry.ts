/**
 * Innerhalb eines Ply ist die Stellung dieselbe — das IST das Intervall zwischen zwei Commits.
 * Eine Korrektur an einem Frame gilt darum für jedes andere Frame desselben (session, ply) und
 * wird dort nur VORGESCHLAGEN; das Alpha-Urteil reist nie mit, jeder Schnitt ist ein eigener.
 */
import { fenLabels } from "@/lib/fen";
import type { Labels, Row } from "@/lib/selection";

/** Was der Übertrag über ein Frame wissen muss — `VerifyFrame` trägt das alles schon. */
export type CarryFrame = { session: number; ply: number; stem: string; fen: string };
/** `session|ply -> {square: label}`: Stellungskorrekturen, und sonst nichts. */
export type Carried = Record<string, Labels>;

export function carryKey(frame: { session: number; ply: number }): string {
  return `${frame.session}|${frame.ply}`;
}

/** Beim ⏎, nicht vorher: was geschrieben wurde, ist ab jetzt der Vorschlag des Intervalls. */
export function carryCorrections(carried: Carried, frame: { session: number; ply: number }, rows: Row[]): Carried {
  if (rows.length === 0) return carried;
  const key = carryKey(frame);
  return { ...carried, [key]: { ...carried[key], ...Object.fromEntries(rows.map((r) => [r.square, r.label])) } };
}

/** Was das Ledger für diesen Stem schon entschieden hat und was der FEN sagt, ist kein Vorschlag. */
export function carriedFor(input: { carried?: Labels; frame: CarryFrame; decided: Record<string, string> }): Labels {
  const { carried, frame, decided } = input;
  if (!carried) return {};
  const fen = fenLabels(frame.fen);
  const out: Labels = {};
  for (const [square, label] of Object.entries(carried)) {
    if (decided[`${frame.stem}|${square}`] === undefined && fen[square] !== label) out[square] = label;
  }
  return out;
}

/** Für die Kopfzeile: die Frames dieses Plys, bei denen wirklich etwas vorbelegt ist. */
export function prefilledFrames(input: {
  frames: CarryFrame[];
  carried: Carried;
  key: string;
  decided: (frame: CarryFrame) => Record<string, string>;
}): CarryFrame[] {
  const { frames, carried, key, decided } = input;
  return frames.filter(
    (f) =>
      carryKey(f) === key &&
      Object.keys(carriedFor({ carried: carried[key], frame: f, decided: decided(f) })).length > 0,
  );
}
