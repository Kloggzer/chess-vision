# Abdeckung, zum ersten Mal gemessen (2026-09-14)

Bis heute hat das Projekt seine Testabdeckung nie gemessen — keine Konfiguration, kein Werkzeug
installiert. Die Zahlen unten sind der erste Stand; die Werkzeuge liegen jetzt im Baum, damit sie
wiederholbar sind.

## Wie

- **Python:** `uv run --with pytest-cov pytest --cov=src/chesslab`.
  `tests/test_serving.py::test_cuda_graph_path_matches_eager` muss dabei ABGEWAEHLT werden — unter
  der Instrumentierung stirbt der Prozess in `torch`s `Module.to` mit einer Access Violation.
- **Web:** `npx vitest run --coverage.enabled --coverage.provider=v8` in `platform/app`.
- **Kotlin:** `./gradlew.bat koverXmlReport koverLog --continue` in `android`. `--continue` ist
  noetig, weil `ModelSpecTest` absichtlich rot steht; `:app` liefert deshalb ueberhaupt keinen
  Bericht — seine 509 Tests fehlen in jeder Zahl unten.
  **Ueberholt (nachgesehen 2026-09-22):** `ModelSpecTest` traegt keine Abwahl mehr und ist seit den
  gemessenen `coverage_gate`s gruen, `--continue` also nicht mehr noetig; `:app` haelt heute **651**
  `@Test` (`grep -rc '@Test' android/app/src/test --include=*.kt`, Summe).

## Was

| Bereich | Zeilen |
|---|---|
| Kotlin `core-cnn` | 97,2 % |
| Kotlin `core-engine` | 92,2 % |
| Kotlin `core-geometry` | 90,5 % |
| Web `lib/` | 73,9 % |
| **Python `src/chesslab` gesamt** | **67,1 %** |
| **Kotlin gesamt (ohne `:app`)** | **64,7 %** |
| Kotlin `tracker-runtime` | 58,2 % |
| Kotlin `desktop` | 37,6 % |
| Kotlin `arena` | 23,7 % |
| Web `app/api` (Routen) | 18,6 % |
| Web `app/` (UI-Seiten) | 0 % |

Die schwaechsten Python-Module: `training/clahe_gpu.py` 0 %, `meshprep.py` 15 %,
`training/train.py` 25 %, `cli.py` 29 %, `hand_gate.py` 34 %.
`training/clahe_gpu.py` **gibt es nicht mehr** (geloescht in `5325262e`, nachgesehen 2026-09-22) —
es bleiben vier Module.

## Was die Zahl NICHT sagt

Am selben Tag fanden sechs Agenten **73 belegbare Fehler**, jeden mit einem Test, den es vorher
nicht gab — in einem Baum mit 1 097 Python-, 385 Web- und ueber 1 400 Kotlin-Tests
(**nachgezaehlt 2026-09-22: 1 520** `def test_` unter `tests/`, **176** Web-Testdateien unter
`platform/app`, **651** `@Test` allein in `:app` — jede Prozentzahl oben ist damit veraltet und
muss vor dem Zitieren neu gemessen werden). Die
Verteilung ist also das Problem, nicht die Hoehe: `core-engine` stand bei 92 % und trug trotzdem
vier Stellungs-Bugs, weil die gedeckten Zeilen ohne Zusicherung ueber ihr Verhalten im Fehlerfall
liefen.

Wer die Zahl heben will, faengt bei den Fehlerpfaden an, nicht bei `app/` — die UI-Seiten sind
unbedeckt, weil niemand sie testet, und das ist eine bewusste Nicht-Entscheidung, keine Luecke,
die ein Rendering-Test schliessen wuerde.
