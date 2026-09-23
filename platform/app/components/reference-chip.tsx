import { Hint } from "@/app/page-title";
import type { ReferenceOrigin } from "@/lib/chain/chain";

/**
 * A `phone` reference is not an independent witness, and the confirm screen must say so where the
 * human decides: the notation came from the tracker that also read this video, so the comparison
 * finds a divergence between the live run and the replay — never a move both got wrong.
 */
const WHAT: Record<ReferenceOrigin, { text: string; why: string; tone: string }> = {
  none: {
    text: "keine reference.pgn",
    why: "Es gibt nichts zu vergleichen — jeder Halbzug ist deiner.",
    tone: "text-muted-foreground",
  },
  phone: {
    text: "Referenz: das PGN des Handys — kein unabhängiger Zeuge",
    why:
      "Diese Notation hat der Tracker live geschrieben, aus demselben Spiel. Bestätigen vergleicht " +
      "damit seinen Replay gegen seinen eigenen Live-Lauf: gleiches Verfahren, gleiches Video. Ein " +
      "Zug, den beide gleich falsch lesen, deckt sich sauber und fällt nie auf. `chesslab realgames " +
      "confirm --yes` verweigert hier aus demselben Grund.",
    tone: "text-amber-500",
  },
  outside: {
    text: "Referenz: von außen",
    why: "Die Notation steht in keiner files/games/*.pgn dieses Bundles — hochgeladen oder von Hand geschrieben.",
    tone: "text-muted-foreground",
  },
};

/** Same test as `realgames.reference_is_the_phones_own`, said where the verdict is given. */
export function ReferenceChip({ origin }: { origin: ReferenceOrigin }) {
  const { text, why, tone } = WHAT[origin];
  return <Hint className={tone} tip={why}>{text}</Hint>;
}
