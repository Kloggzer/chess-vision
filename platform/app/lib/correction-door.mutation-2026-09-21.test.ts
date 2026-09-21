/**
 * Die Tuer zur GLOBALEN Trainingseingabe. Zwei Sperren standen hier ohne Test: das Feldmuster —
 * was sie durchlaesst, liest Python nie wieder als Feld — und das `=== true` am Grabstein, denn
 * ein wahrheitsartiger Wert wuerde daraus einen Widerruf machen, den niemand gefaellt hat.
 */
import { expect, test } from "vitest";
import { validate } from "@/lib/corrections";

const row = (extra: Record<string, unknown>) =>
  ({ session_id: "rg-rec-1", frame: "000001", square: "a1", label: "wP", ...extra });

test("was kein Feld a1..h8 ist, kommt nicht ins Ledger", () => {
  for (const square of ["j9", "a9", "A1", "a1 ", "", "a10"]) {
    expect(() => validate(row({ square })), square).toThrow(/bad square/);
  }
  expect(() => validate({ session_id: "rg-rec-1", frame: "000001", label: "wP" })).toThrow(/bad square/);
});

test("nur das woertliche true ist ein Grabstein", () => {
  // `"false"` und `1` sind wahrheitsartig: als Widerruf gelesen loeschen sie ein Urteil, das ein
  // Mensch gerade erst gefaellt hat.
  for (const retract of [false, "false", "no", 1, 0, null]) {
    expect(validate(row({ retract })), String(retract)).not.toHaveProperty("retract");
  }
  expect(validate(row({ retract: true })).retract).toBe(true);
});
