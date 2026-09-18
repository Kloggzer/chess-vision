# SonarCloud: was analysiert wird und was nicht (2026-09-18)

Die Organisation `kloggzer` hat ein Kontingent von **50 000 ncloc**. Der gezogene Bericht meldete
**141 587** und wurde deshalb abgelehnt. Kein Zaehlfehler: `node_modules`, `data/` und die
Build-Ausgaben sind alle draussen — das Repo ist schlicht so gross.

## Woher die Zeilen kommen

Roh traegt das Repo **247 748** Zeilen in 2 556 versionierten Quelldateien; Sonar zaehlt `ncloc`,
also ohne Kommentare und Leerzeilen, und kommt damit auf 141 587 (57 %).

| Bereich | ncloc (Naeherung) |
|---|---|
| `src/chesslab` | 20 707 |
| `scripts/` | 13 597 |
| `android/app` (Compose-Huelle) | 18 248 |
| `platform/app` (Web, ohne `lib/`) | 8 855 |
| `android/tracker-runtime` | 7 129 |
| `android/desktop` (Replay-Werkzeug) | 6 223 |
| `platform/app/lib` | 6 212 |
| `android/core-engine` | 5 604 |
| `synth/` | 2 831 |
| `android/core-geometry` | 2 665 |
| **Produktivcode gesamt** | **94 166** |
| **Tests gesamt** | **61 592** |

**39 % des Codes sind Tests.** Das ist keine Aufblaehung, sondern die Pruefschicht, an der dieses
Projekt haengt. Sie aus der Zaehlung zu nehmen reicht aber NICHT: der Produktivcode allein liegt
mit 94 166 noch beim Doppelten des Kontingents.

## Der gewaehlte Schnitt

Analysiert wird der Weg AUFS GERAET plus der Datenkern — dort kostet ein Fehler etwas:

| in `sonar.sources` | ncloc |
|---|---|
| `src/chesslab` | 20 707 |
| `android/tracker-runtime/src/main` | 7 010 |
| `platform/app/lib` | 6 212 |
| `android/core-engine/src/main` | 5 572 |
| `android/core-geometry/src/main` | 2 638 |
| `android/core-cnn/src/main` | 885 |
| `android/arena/src/main` | 761 |
| `platform/app/app/api` | 567 |
| **Summe** | **44 352** |

Gegen den echten Bericht lag diese Naeherung 10 % zu hoch, real also eher **~40 400**.

**Draussen, mit Grund:** `android/app` ist die Compose-Huelle, die Logik sitzt in
`tracker-runtime` und `core-engine`. `android/desktop` ist das Replay-Werkzeug und geht nie aufs
Geraet. Die Next-Seiten ausser den API-Routen sind UI ohne Vertrag. `scripts/` und `synth/` sind
Messwerkzeug und Renderer.

**Was das kostet:** die Android-UI, der Desktop-Replay und die Auswertungsskripte werden nicht
gemessen. Fuer `scripts/` faellt das am ehesten ins Gewicht — dort lag heute ein halbes Jahr lang
ein toter `sweep_prior_lambda.py`, den kein Werkzeug gemeldet hat.

`tests/test_sonar_scope.py` haelt den Umfang: er schlaegt bei 46 000 an, also bevor SonarCloud
ablehnt, und prueft ausserdem, dass jeder genannte Pfad existiert — die alte
`sonar-project.properties` zeigte einmal auf ein zwei Wochen zuvor geloeschtes Verzeichnis.

**Offen:** `sonar.projectKey` steht auf `CHANGEME`. Der Schluessel kommt aus SonarCloud und ist
nicht zu raten.
