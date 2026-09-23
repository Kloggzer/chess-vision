import { expect, test } from "vitest";
import { lastLine, parseCost } from "@/lib/chain/session-delete";

/** What `chesslab session delete <id> --dry-run` prints, and nothing else. */
const LINE = '{"session_id": "rg-2026-08-07-13-52-38", "frames": 384, "crops": 360796, "corrections": 3684}';

test("the dry run's one JSON line is read, not recomputed", () => {
  expect(parseCost(LINE + "\n")).toEqual({
    session_id: "rg-2026-08-07-13-52-38",
    frames: 384,
    crops: 360796,
    corrections: 3684,
  });
});

test("uv's own chatter before the verb does not become the answer", () => {
  const noisy = ["Installed 42 packages in 1.2s", "{not json", LINE].join("\n");
  expect(parseCost(noisy)?.crops).toBe(360796);
});

test("a run that printed no count answers null — never a zero nobody counted", () => {
  expect(parseCost("")).toBeNull();
  expect(parseCost("Error: Session 'rg-nope' not found.")).toBeNull();
  // A JSON line of the wrong shape is not this command's answer either.
  expect(parseCost('{"ok": true}')).toBeNull();
});

test("the tool's last word is reported, instead of a success sentence of our own", () => {
  expect(lastLine("[--] rg-x: 384 Zeilen\n[OK] rg-x geloescht (360796 Crops mit)\n")).toBe(
    "[OK] rg-x geloescht (360796 Crops mit)",
  );
  expect(lastLine("")).toBe("");
});
