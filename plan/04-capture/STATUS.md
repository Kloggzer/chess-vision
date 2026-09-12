# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | todo | |
| 01 | 01-capture-app.md | todo | |
| 02 | 02-messachsen.md | todo | |

## Dependencies

00 landet allein und zuerst. 01 und 02 laufen danach parallel; 02 liest `capture.json`, dessen
Schreiber 01 ist, kann seine Tests aber gegen eine von Hand geschriebene Datei fahren.

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

**Zahlen, zweimal korrigiert.** Gemessen und dreifach bestaetigt: **58 duenne Zellen, 34 Stellung,
24 Licht, 27 bei null**. `brightness` fehlt in 376 640 von 979 363 Zeilen (allen Kompositen).
Verkuerzung **0,955–1,025**, Median 0,986 ueber die **24** Aufnahmen mit `corners`; der Datensatz
traegt davon **23** (die 24. hat noch keinen Pack).

**`--rot90` +0,0245 ist gemessen** (7 gepaarte Seeds, p = 0,0078, `docs/plan-98/00-plan.md`). Der
Wert −0,046 in `docs/model-improvement-results-2026-08-27.md:66` ist etwas anderes: 80 px, ohne
Flip, ohne Brettkopf, anderer Datensatz. Beide stimmen.

Fassung 4 ist noch nicht geprueft.

## Session log

(leer)
