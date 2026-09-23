# Ratschen und die JSON-Treuhand

Aus CLAUDE.md verschoben (2026-09-23). CLAUDE.md haelt nur die Regeln; hier stehen Zahlen und
Herkunft. Offene Punkte dazu: `docs/offene-entscheidungen.md`.

## JSON-Treuhand in drei Sprachen (2026-09-16)

Jeder Schreib- und Lesevorgang auf `.json`/`.jsonl` laeuft durch einen Treuhaender:
`src/chesslab/ioutil.py`, `platform/app/lib/jsonl.ts` + `lib/atomic.ts`,
`android/tracker-runtime/.../io/Jsonl.kt`. Ueberall entscheidet der Zeilenumbruch, ueberall wird
ueber eine Nebendatei geschrieben und die bei einem Abbruch geraeumt.

- `read_jsonl`: halbe LETZTE Zeile faellt weg, eine kaputte MITTENDRIN wirft, `newline=""`, weil
  die Mehrheit CRLF traegt (2026-09-21 ueber alle `.jsonl` ohne `.git/node_modules/tmp/.venv/tools`,
  an den ersten 64 KB entschieden: 1 563 Dateien, 1 307 CRLF, 242 nur-LF, 14 leer). Gelesen wird
  `utf-8-sig`: PowerShells `Out-File` stempelt ein BOM, und eines liess 2026-08-16 jeden
  Datensatz-Bau am Vorflug sterben.
- `write_rows`/`write_json` (Nebendatei, dann umhaengen), `append_rows` (repariert erst den
  abgerissenen Schwanz), `update_rows`/`write_rows_guarded`/`write_json_guarded` (Stempel-Riegel,
  `Contested` statt stiller Ueberschreibung).
- Vor dem Umstellen gemessen: 40 000 Manifest- und alle 9 423 `matte.jsonl`-Zeilen ueberstanden
  `read_jsonl` + `write_rows` bytegleich.
- Kotlin braucht kein `appendRows` — null Stellen haengen an eine fremde oder aeltere Datei an;
  `SessionTimeline` und `SessionRecorder` kuerzen im Konstruktor. Der Bruch lag auf der Leseseite:
  die Desktop-Werkzeuge warfen auf die halbe letzte Zeile, die das Telefon erwartbar hinterlaesst
  (`TornTailTest`), und `RecordedFrames` verschluckte eine kaputte Zeile mittendrin.
- Web: rohes `appendFile` an eine `.jsonl` mit halber letzter Zeile klebte die neue Zeile daran —
  aus einem tolerierten Schwanz wurde Korruption mittendrin. `appendRows` schneidet vorher ab
  (`lib/append-tail.test.ts`).

## Die Ratschen (duerfen nur schrumpfen)

| Liste | Waechter | Stand |
|---|---|---|
| `tests/json_doors.txt` (wer selbst SCHREIBT) | pytest | `scripts/`: 8 Stellen in 8 Dateien (2026-09-21) |
| `tests/jsonl_readers.txt` (wer selbst SCHNEIDET) | pytest | `scripts/`: 16 Stellen in 11 Dateien (2026-09-21) |
| `platform/app/jsonl-readers.txt` | `lib/jsonl-ratchet.test.ts` | 11 Stellen in 7 Dateien (2026-09-21), Start 24 in 11 |
| `platform/app/write-doors.txt` | vitest | 3 Stellen in 2 Dateien, Start 12 in 10 |
| `platform/app/route-coverage.txt` | `lib/route-coverage.test.ts` | 0 von 29 Routen ohne Test (2026-09-21), Start 18 |
| `*/comment-budget.txt` (drei Sprachen) | `CommentBudgetTest`, `comment-budget.test.ts`, `test_comment_budget.py` | nur schrumpfen |

Wer eine Zahl zitiert, sagt dazu, ob er Stellen oder Dateien meint — die "13 Leser" vom 2026-09-17
nannten keine Basis und passten zu keiner Zaehlweise.

**Routen-Ratsche:** eine Route zaehlt als getestet, wenn ein Test `@/app/<pfad>/route` importiert.
Bewusst die Routen und nicht die Gesamtabdeckung: `core-engine` stand bei 92 % und trug vier
Stellungsfehler. Der Erkenner zaehlte bis 2026-09-21 auch einen Routen-Pfad in einer Zeichenkette,
einen auskommentierten Import und `describe.skip` als getestet; seitdem `platform/app/ratchet-detect.ts`
mit Gegenprobe.

**Kommentar-Zaehler:** alle drei waren bis 2026-09-21 blind fuer Zeichenketten — ein `#`, `//`
oder `/*` in einem String zaehlte als Kommentar.
