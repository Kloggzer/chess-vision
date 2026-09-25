/** Zelle, Brett und Alpha schneidet Python (`web_cuts.py`) wie der Slice — was die Label-Ansicht
 *  zeigt, IST der Trainings-Crop. Hier bleibt nur die Uebersetzung der Antwort. */
import { pyCall } from "@/lib/py/worker";
import { checkName, dataDir } from "@/lib/session-store/recordings";

export const CUT_MIME = "image/jpeg";

/** 404 oder 500 entscheidet `lib/http-error.ts` an Pythons Fehlerklasse. */
async function cut(op: string, name: string, stem: string, args: Record<string, unknown>): Promise<Buffer> {
  checkName(name, "game name");
  checkName(stem, "frame");
  return Buffer.from(await pyCall<string>(op, { root: dataDir(), name, stem, ...args }), "base64");
}

/** Ohne `log.jsonl` schneidet Python aus den Handy-JPEGs des Bundles (`files/sessions/`). */
export const cellPng = (name: string, stem: string, square: string, size: number, median = false) =>
  cut("cut_cell", name, stem, { square, size, median });

export const boardPng = (name: string, stem: string, size: number) => cut("cut_board", name, stem, { size });

/** Nur der Import (cv2, `labeling`), fuer `instrumentation.ts`. */
export const warmCuts = (): Promise<boolean> => pyCall<boolean>("warm_cuts");

export const mattePng = (name: string, stem: string, size: number) => cut("cut_matte", name, stem, { size });
