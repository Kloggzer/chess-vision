# Qualitaetswerkzeuge: JSON-Treuhand, Ratschen, Abdeckung, SonarCloud

CLAUDE.md haelt die Regeln; hier stehen Zahlen und Herkunft. Offene Punkte:
`docs/offene-entscheidungen.md`.

## JSON-Treuhand in drei Sprachen (2026-09-16)

Jeder Schreib- und Lesevorgang auf `.json`/`.jsonl` laeuft durch einen Treuhaender:
`src/chesslab/ioutil.py`, `platform/app/lib/jsonl.ts` + `lib/atomic.ts`,
`android/tracker-runtime/.../io/Jsonl.kt`. Ueberall entscheidet der Zeilenumbruch, ueberall wird
ueber eine Nebendatei geschrieben und die bei einem Abbruch geraeumt.

- `read_jsonl`: halbe LETZTE Zeile faellt weg, eine kaputte MITTENDRIN wirft, `newline=""`, weil
  die Mehrheit CRLF traegt (2026-09-21: 1 563 Dateien, 1 307 CRLF, 242 nur-LF, 14 leer). Gelesen
  wird `utf-8-sig`: PowerShells `Out-File` stempelt ein BOM, und eines liess 2026-08-16 jeden
  Datensatz-Bau am Vorflug sterben.
- `write_rows`/`write_json` (Nebendatei, dann umhaengen), `append_rows` (repariert erst den
  abgerissenen Schwanz), `update_rows`/`write_rows_guarded`/`write_json_guarded` (Stempel-Riegel,
  `Contested` statt stiller Ueberschreibung).
- Vor dem Umstellen gemessen: 40 000 Manifest- und alle 9 423 `matte.jsonl`-Zeilen ueberstanden
  `read_jsonl` + `write_rows` bytegleich.
- Kotlin braucht kein `appendRows` — keine Stelle haengt an eine fremde oder aeltere Datei an. Der
  Bruch lag auf der Leseseite: die Desktop-Werkzeuge warfen auf die halbe letzte Zeile, die das
  Telefon erwartbar hinterlaesst (`TornTailTest`).
- Web: rohes `appendFile` an eine `.jsonl` mit halber letzter Zeile machte aus einem tolerierten
  Schwanz Korruption mittendrin. `appendRows` schneidet vorher ab (`lib/append-tail.test.ts`).

## Die Ratschen (duerfen nur schrumpfen)

| Liste | Waechter | Stand 2026-09-26 |
|---|---|---|
| `tests/json_doors.txt` (wer SCHREIBT) | pytest | `src/`: 9 Stellen/8 Dateien, `scripts/`: 5/5 |
| `tests/jsonl_readers.txt` (wer SCHNEIDET) | pytest | `src/`: 1/1, `scripts/`: 1/1 |
| `platform/app/jsonl-readers.txt` | `lib/jsonl-ratchet.test.ts` | 7 Stellen/6 Dateien |
| `platform/app/write-doors.txt` | vitest | 3 Stellen in 2 Dateien |
| `platform/app/route-coverage.txt` | `lib/route-coverage.test.ts` | 0 von 29 Routen ohne Test |
| `*/comment-budget.txt` (drei Sprachen) | je ein Budget-Test | nur schrumpfen |

Budget-Tests: `CommentBudgetTest`, `comment-budget.test.ts`, `test_comment_budget.py`.
Wer eine Zahl zitiert, sagt dazu, ob er Stellen oder Dateien meint.

- **Routen-Ratsche:** eine Route zaehlt als getestet, wenn ein Test `@/app/<pfad>/route` importiert.
  Bewusst die Routen und nicht die Gesamtabdeckung (siehe unten). Der Erkenner ist
  `platform/app/ratchet-detect.ts` mit Gegenprobe — vorher zaehlten ein Pfad in einer Zeichenkette,
  ein auskommentierter Import und `describe.skip` als getestet.
- **Kommentar-Zaehler:** alle drei waren bis 2026-09-21 blind fuer Zeichenketten — ein `#`, `//`
  oder `/*` in einem String zaehlte als Kommentar.

## Testabdeckung

Zuletzt gemessen 2026-09-14; nachgezaehlt 2026-09-22 sind es 1 520 `def test_`, 176 Web-Testdateien
und 651 `@Test` allein in `:app`. **Wer eine Prozentzahl zitiert, misst neu.** Die Aufrufe:

- **Python:** `uv run --with pytest-cov pytest --cov=src/chesslab`, dabei
  `tests/test_serving.py::test_cuda_graph_path_matches_eager` ABWAEHLEN — unter der Instrumentierung
  stirbt der Prozess in `torch`s `Module.to` mit einer Access Violation.
- **Web:** `npx vitest run --coverage.enabled --coverage.provider=v8` in `platform/app`.
- **Kotlin:** `./gradlew.bat koverXmlReport koverLog` in `android`. `:app` liefert nur einen Bericht,
  wenn alle seine Tests gruen sind (solange `ModelSpecTest` rot stand, fehlte `:app` ganz).

Stand 2026-09-14: Python 67,1 %, Kotlin ohne `:app` 64,7 % (`core-engine` 92,2 %, `desktop` 37,6 %),
Web `lib/` 73,9 %, Web-Routen 18,6 %. Schwaechste Python-Module damals: `meshprep.py`,
`training/train.py`, `cli.py` (heute das Paket `cli/`), `hand_gate.py`.

**Die Verteilung ist das Problem, nicht die Hoehe.** Am selben Tag fanden sechs Agenten 73
belegbare Fehler; `core-engine` stand bei 92 % und trug vier Stellungs-Bugs, weil die gedeckten
Zeilen ohne Zusicherung ueber ihr Verhalten im Fehlerfall liefen. Wer die Zahl heben will, faengt
bei den Fehlerpfaden an. Die UI-Seiten (`app/`) sind bewusst unbedeckt.

## SonarCloud: was analysiert wird (2026-09-18)

Die Organisation `kloggzer` hat **50 000 ncloc**; das ganze Repo traegt **141 587** (ohne
`node_modules`, `data/`, Build-Ausgaben), davon 61 592 Tests. Auch der Produktivcode allein
(94 166) liegt beim Doppelten — Tests herauszunehmen reicht nicht.

**Analysiert wird der Weg AUFS GERAET plus der Datenkern** (`sonar.sources`): `src/chesslab`,
`android/{core-engine,core-geometry,core-cnn,tracker-runtime,arena}/src/main`, `platform/app/lib`,
`platform/app/app/api` — genaehert 44 352, real eher ~40 400.

**Draussen, mit Grund:** `android/app` ist die Compose-Huelle, `android/desktop` geht nie aufs
Geraet, die Next-Seiten ausser den API-Routen sind UI ohne Vertrag, `scripts/` und `synth/` sind
Messwerkzeug und Renderer. Das kostet am ehesten bei `scripts/`: toten Code dort meldet kein Werkzeug.

`tests/test_sonar_scope.py` haelt den Umfang: er schlaegt bei 46 000 an, bevor SonarCloud ablehnt,
und prueft, dass jeder genannte Pfad existiert. **Offen:** `sonar.projectKey` steht auf `CHANGEME`
— der Schluessel kommt aus SonarCloud und ist nicht zu raten.
