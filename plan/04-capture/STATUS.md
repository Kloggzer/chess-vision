# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | todo | |
| 01 | 01-extraktion.md | todo | |
| 02 | 02-capture-app.md | todo | |
| 03 | 03-messachsen.md | todo | |

## Dependencies

00 und 01 sind Vertragslieferanten, teilen keine Datei und koennen parallel laufen. 02 braucht
beide. 03 haengt nur an 00 und testet gegen eine von Hand geschriebene `capture.json`.

**01 ist die einzige Phase, die `:app` anfasst.** Sie aendert kein Verhalten; ihr Abnahmekriterium
ist ein vollstaendig gruenes `:app`.

## Manual steps

Die Aufnahmen macht der Nutzer: Stellung aufbauen, Licht stellen, Figur drehen, Hoehe aendern.
Kein Agent nimmt etwas auf.

## Notes / discrepancies

**Drei Pruefungen durch fremde Agenten, 2026-09-12, alle drei „nicht umsetzbar".** Fassung 4
beantwortet sie; die Entwurfsfragen zuerst:

| Blocker | Antwort |
|---|---|
| `:tracker-runtime` hat null CameraX-Dateien | 01 baut eine eigene Bindung; die Governors liegen dort und bleiben aus ENTSCHEIDUNG draussen |
| Kein Feld hat „sehr hell" als haeufigstes Band | Ein Auftrag nennt ein FELD, kein Band |
| Abdeckung kann nicht live sein | Fortschritt gegen den Plan, Abdeckung mit `generated_at` |
| `SessionRecorder` will einen FEN, ein Aufbau hat keine Partie | Nachgemessen: `GameState("8/8/8/8/8/7Q/8/8 w - - 0 1").label_for("h3")` = `wQ`. Kein neuer Artefakttyp |
| Wie wird aus dem Upload eine Aufnahme? | Ingest legt unter `files/sessions/<id>/` ab, `realgames.stored_session_dirs` liest dort, `fit-stored` + `export-session` machen `boards/` — der bestehende Weg jeder Handy-Aufnahme |
| `id` kollidierte (58 Luecken, 24 Paare) | Band gehoert in den Slug; 58 von 58 eindeutig, mit Regressionstest |
| `reference_square` bei `fix="Licht"` unentscheidbar | Feld naeher an der Bandmitte — fuer alle fuenf Baender definiert |
| `capture.json` hatte keinen Autor und kein Schema | Gehoert 01, eigenes Schema, 02 spiegelt es als TypedDict |
| `pose_of` hatte keinen Abnehmer | `axes.foreshorten`, in 0,05er-Stufen |
| Akzeptanz von 02 war leer erfuellbar | Test mit ANGELEGTER `capture.json` |
| Kotlin liess `Gap` und die Plan-Huelle weg | Beide deklariert, `@SerialName`, `ignoreUnknownKeys` |
| Keine Oberflaechenspezifikation | Drei Bildschirme, 12dp-Tokens, `contentDescription` |
| CNN-Check braucht Assets aus `:app` | Gestrichen; spaetere Phase, wenn ueberhaupt |
| `turntable` gehoert dem Drehteller | Alles heisst `capture`, auch das Pack-Verzeichnis |
| **Drei zweite Implementierungen** (Nutzer, 2026-09-12) | Neue Phase 01: `fenOf` gibt es in `core-engine/board/ReadingFen.kt` schon und wird nur geoeffnet; `ArucoCalibrator` (139 Zeilen) und die `ImageAnalysis`-Bindung (rund 80 der 491 Zeilen `TrackerCamera.kt`) wandern nach `:board-setup`, aus dem beide Apps ziehen |

**Zahlen, zweimal korrigiert.** Gemessen und dreifach bestaetigt: **58 duenne Zellen, 34 Stellung,
24 Licht, 27 bei null**. `brightness` fehlt in 376 640 von 979 363 Zeilen (allen Kompositen).
Verkuerzung **0,955–1,025**, Median 0,986 ueber die **24** Aufnahmen mit `corners`; der Datensatz
traegt davon **23** (die 24. hat noch keinen Pack).

**`--rot90` +0,0245 ist gemessen** (7 gepaarte Seeds, p = 0,0078, `docs/plan-98/00-plan.md`). Der
Wert −0,046 in `docs/model-improvement-results-2026-08-27.md:66` ist etwas anderes: 80 px, ohne
Flip, ohne Brettkopf, anderer Datensatz. Beide stimmen.

**Was Phase 01 kostet und was sie spart.** Gemessen: `:app` traegt 1 737 Zeilen Kamera in neun
Dateien, davon wandern nur die Bindung und der Kalibrierer. `ArucoCalibrator` kann NICHT nach
`:core-geometry` — er braucht `android.graphics.Bitmap` und `org.opencv.android.Utils`, und
`:core-geometry` ist bewusst reines JVM. Deshalb ein Android-Library-Modul dazwischen.
`TrackerCamera` bindet heute nur `ImageAnalysis` und keinen `ImageCapture`; ein Standbild ist das
zuletzt gelieferte Analysebild, also braucht `:capture` kein zweites Kameramuster.

Der Preis: Phase 01 fasst die ausgelieferte Tracker-App an. Deshalb woertliches Verschieben, kein
Umbau, und bei der kleinsten Unklarheit anhalten statt umbauen.

Fassung 5 ist noch nicht geprueft.

## Session log

(leer)
