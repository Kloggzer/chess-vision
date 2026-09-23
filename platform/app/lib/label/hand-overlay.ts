/** Die Brett-Vorschau zeigt nur die Matte: der Rillen-Sensor nannte 53,8 % der Matte-Hand und sah
 *  aus wie die ganze. Ein Frame ohne Matte ist UNGEMESSEN, nicht handfrei. */
import { PIECE_VISIBLE_MAX } from "@/lib/classes";

export type MatteOverlay = {
  /** Das Alpha selbst, in seiner eigenen Form — `null`, solange niemand gemattet hat. */
  src: string | null;
  measured: boolean;
  /** Wie viele Felder ueber `PIECE_VISIBLE_MAX` liegen, fuer den Untertitel. */
  covered: number;
};

export function matteOverlay(
  coverage: Record<string, number> | undefined,
  src: string,
): MatteOverlay {
  if (!coverage) return { src: null, measured: false, covered: 0 };
  return {
    src,
    measured: true,
    covered: Object.values(coverage).filter((v) => v > PIECE_VISIBLE_MAX).length,
  };
}
