import type { Correction, Ledger } from "@/lib/session-store/corrections";

export type Verdict = { rows: Correction[]; ledger: Ledger };
/** `prior` holds what each cell fell back FROM, keyed `session_id|frame|square`. */
export type Flush = (
  pos: number,
  writes: Verdict[],
  prior: Record<string, string | undefined>,
) => Promise<boolean>;

/** Everything the one key handler can ask of the active renderer. */
export type LaneActions = {
  commit?: () => void;
  reject?: () => void;
  flagsOff?: () => void;
  toggleAt?: () => void;
  gridAt?: () => void;
  /** Die ganze Seite auf das Wort des Modells — die Zell-Lanes fragen nichts anderes. */
  floodModel?: () => void;
  step?: (delta: number) => void;
  nextPly?: () => void;
  brush?: (label: string) => void;
  undo?: () => boolean;
};
