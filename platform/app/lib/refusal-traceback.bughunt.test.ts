/**
 * `exit 1` sagt nicht, WAS schiefging.
 *
 * `phone-record` starb am 2026-09-15 in `retime._write_boards` an einer OpenCV-Meldung, die im
 * Log stand — der Ledger trug `reason: "exit 1"`, und die Confirm-Ansicht sah danach wie ein
 * Anzeigeproblem aus statt wie ein abgebrochener Job. Hausregel: Hintergrundarbeit meldet nicht
 * nur DASS sie scheiterte, sondern WARUM.
 */
import { expect, test } from "vitest";
import { refusalOf } from "@/lib/jobs";

const TRACEBACK = [
  "  retime 9561/9593 frames read",
  "Traceback (most recent call last):",
  '  File "/repo/src/chesslab/retime.py", line 348, in _write_boards',
  "    if cv2.imwrite(str(tmp), padded, encode):",
  "cv2.error: OpenCV(4.13.0) loadsave.cpp:1072: error: (-2:Unspecified error) could not find a writer for the specified extension in function 'cv::imwrite_'",
  "",
].join("\n");

test("die letzte Zeile eines Tracebacks ist der Grund", () => {
  expect(refusalOf(TRACEBACK)).toMatch(/could not find a writer/);
});

test("ein ausdrueckliches `refused:` schlaegt den Traceback", () => {
  // Der Verb-eigene Satz ist fuer den Menschen geschrieben, der Traceback fuer mich.
  const log = `${TRACEBACK}\nrefused: kein Modell gewaehlt`;
  expect(refusalOf(log)).toBe("kein Modell gewaehlt");
});

test("ein Log ohne beides bleibt null — dann zaehlt der Exit-Code", () => {
  expect(refusalOf("  retime 900/9593 frames read\n")).toBeNull();
});

test("die Rich-Rahmen der Typer-Ausgabe zaehlen nicht als Grund", () => {
  // Typer malt den Traceback in einen Kasten; die letzte Zeile ist dann `└────┘`.
  const boxed = `${TRACEBACK}\n└─────────────────────────────┘\n`;
  expect(refusalOf(boxed)).toMatch(/could not find a writer/);
});
