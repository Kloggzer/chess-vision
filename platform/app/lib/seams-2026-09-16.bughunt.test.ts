/**
 * Naht-Jagd 2026-09-16: drei Stellen, an denen ein Schluessel die Sprachgrenze nicht ueberlebt.
 * Jede Fixture hat genau die Form, die die ANDERE Seite auf die Platte schreibt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { gemessen, tempDataRoot, writeSession } from "@/lib/test-fixtures";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function reports(root: string, file: string, text: string): Promise<void> {
  await mkdir(path.join(root, "reports"), { recursive: true });
  await writeFile(path.join(root, "reports", file), text, "utf8");
}

function forget(key: string): void {
  (globalThis as Record<string, unknown>)[key] = new Map();
}

/**
 * `matte-wanted` ist eine Sackgasse. Die Frame-Lane schreibt den Zettel (`app/api/frame-verdict`),
 * `openFrames` nimmt das Frame daraufhin aus der Lane — aber `matteCensus` zaehlt nur `dirty`, und
 * `runChesslab` uebergibt nur `--reported` oder `--limit`. `occluders alpha-worker --wanted`, das
 * Python dafuer hat, faehrt niemand. Das Frame ist danach weder sichtbar noch gemattet.
 */
test("ein zur Matte geschicktes Frame bleibt offene Arbeit, nicht bloss unsichtbar", async () => {
  const root = await tempDataRoot("wanted");
  const name = "2026-09-16-10-00-00";
  await writeSession({
    root, name,
    rows: [{ frame: 100, fen: FEN, dirty: true, extra: { dirty_reason: "occluded" } }],
  });
  await mkdir(path.join(root, "labels"), { recursive: true });
  await writeFile(
    path.join(root, "labels", "review-notes.jsonl"),
    JSON.stringify({ session_id: `rg-${name}`, frame: "000100", verdict: "matte-wanted",
                     ts: "2026-09-16T10:00:00+00:00" }) + "\n",
    "utf8",
  );
  forget("__chesslabReviewNotes");
  forget("__chesslabMatteSets");
  // EIGENES Feld, nicht `reportedOpen`: das steuert `--reported`, ein zur Matte geschicktes
  // Frame braucht `--wanted`. In einen Zaehler geworfen bekaeme der Lauf die falsche Fahne.
  const { matteCensus } = await import("@/lib/matte");
  expect((await matteCensus(name)).wanted, "sonst ist das Frame nirgends mehr sichtbar").toBe(1);

  // Und die Sprosse darf sich nicht darueber schliessen — sonst ist die Arbeit gezaehlt, aber
  // niemand bietet sie an. (Die Fixture-Session ist unbestaetigt, also direkt an `nextStep`.)
  const { nextStep } = await import("@/lib/chain");
  const full = { done: 9, total: 9, target: 9, reported: 0, reportedOpen: 0, reportedOrphan: 0 };
  expect(nextStep({
    video: "v", videoBroken: null, offeredPgn: null, hasReference: true, hasPhoneRecord: false,
    hasCandidate: true, confirmed: true, hasSession: true, hasSettle: true,
    mattes: { ...full, wanted: 1 }, hasTemporalPass: true, hasModelReads: true,
    outdated: {}, useless: null,
  }).step).toBe("matte");
});

/**
 * `position_flags.timing_flags` schreibt `matte_cov: null` und sagt im Kommentar dazu, warum:
 * „ohne Matte eine 0 zu melden liesse sich in der Lane als 'die Matte sagt frei' lesen". Genau das
 * tut der Leser. Das Geschwister-Modul `hand-flags.ts` macht an derselben Stelle `null` daraus.
 */
test("ein `matte_cov: null` heisst UNGEMESSEN und darf keine 0 werden", async () => {
  const root = await tempDataRoot("poscov");
  await reports(root, "position-flags.jsonl",
    '{"_settle_limit": 45.0, "_seen_min": 0.5, "_visible_max": 0.15, "_unmeasured": []}\n' +
    '{"session_id": "rg-g", "frame": "000100", "square": "e2", "fen_label": "wP", "ply": 3, ' +
    '"dev": 41.2, "matte_cov": null, "seen": true, "reason": "timing"}\n');
  forget("__chesslabMeasurements");
  const { loadPositionFlags } = await import("@/lib/position-flags");
  expect(gemessen(await loadPositionFlags()).rows[0].matte_cov).toBeNull();
});

/**
 * `audit_flags.flags_for` legt `judged` ausdruecklich fuer diese Lane dazu — „die Lane zeigt sonst
 * die FEN und verschweigt, dass hier schon jemand widersprochen hat". Der Leser laesst den
 * Schluessel fallen, die Karte behauptet weiter die FEN.
 */
test.fails("das Wort des Menschen (`judged`) ueberlebt das Lesen der Audit-Flags", async () => {
  const root = await tempDataRoot("judged");
  await reports(root, "audit-flags.jsonl",
    '{"session_id": "rg-g", "frame": "000100", "square": "d8", "fen_label": "bK", ' +
    '"predicted": "bQ", "prob": 0.91, "judged": "bQ", "margin": 0.77, "fold": "interim", ' +
    '"model": "p4a-80-clahe", "ts": "2026-09-16T10:00:00+00:00"}\n');
  forget("__chesslabMeasurements");
  const { loadAuditFlags } = await import("@/lib/audit-flags");
  const row = gemessen(await loadAuditFlags()).rows[0] as unknown as Record<string, unknown>;
  expect(row.judged).toBe("bQ");
});
