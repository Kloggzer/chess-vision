import { expect, test } from "vitest";
import { parseReference } from "@/lib/pgn";

// The editor posts raw text to /api/pgn; what matters downstream is that the file it writes is a
// PGN the confirm view can read back, with the corrected move where the tracker was wrong.
test("a corrected reference replaces the wrong move and stays readable", () => {
  const corrected =
    '[Event "chesslab"]\n\n1. e4 e5 2. d4 d5 3. Nf3 Nc6 4. Nxe5 Nxe5 *\n';
  const ref = parseReference(corrected);
  expect(ref.problem).toBeNull();
  expect(ref.sans?.slice(6)).toEqual(["Nxe5", "Nxe5"]);
});
