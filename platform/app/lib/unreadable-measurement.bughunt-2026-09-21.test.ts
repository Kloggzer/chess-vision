import { mkdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { loadAuditFlags } from "@/lib/audit-flags";
import { loadCorrectionViolations } from "@/lib/correction-violations";
import { dataDir, gameDir } from "@/lib/data";
import { loadFrameHands } from "@/lib/frame-hands";
import { loadHandFlags } from "@/lib/hand-flags";
import { loadModelReads } from "@/lib/model-reads";
import { loadPositionFlags } from "@/lib/position-flags";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * `present: false` heisst "der Producer lief nie", und die Lane schreibt dafuer `—`. Ein
 * LESEFEHLER darf das nicht behaupten: `lib/position-flags.ts` unterscheidet das seit je, seine
 * Geschwister schluckten jeden Fehler und meldeten die Messung als nie gelaufen — gecacht.
 */
const NAME = "2026-09-21-11-00-00";

const report = (file: string) => path.join(dataDir(), "reports", file);

const CASES: { what: string; file: () => string; load: () => Promise<unknown> }[] = [
  { what: "position-flags", file: () => report("position-flags.jsonl"), load: loadPositionFlags },
  { what: "audit-flags", file: () => report("audit-flags.jsonl"), load: loadAuditFlags },
  { what: "hand-flags", file: () => report("hand-flags.jsonl"), load: loadHandFlags },
  { what: "frame-hands", file: () => report("frame-hands.jsonl"), load: loadFrameHands },
  { what: "correction-violations", file: () => report("correction-violations.jsonl"), load: loadCorrectionViolations },
  { what: "model-reads", file: () => path.join(gameDir(NAME), "model-reads.jsonl"), load: () => loadModelReads(NAME) },
];

beforeEach(async () => {
  await tempDataRoot("unreadable");
});

for (const { what, file, load } of CASES) {
  test(`${what}: eine unlesbare Datei ist keine Aussage`, async () => {
    // Ein Verzeichnis an der Stelle der Datei: `stat` gelingt, `readFile` wirft EISDIR — derselbe
    // Weg, den ein Rechtefehler oder ein kaputter Sektor nimmt.
    await mkdir(file(), { recursive: true });
    await expect(load()).rejects.toThrow();
  });
}
