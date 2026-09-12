# Phase 02 — Erfassungs-Modus in `:app`

## Why

Die Aufnahme soll dem Plan folgen statt einem Zettel. `:app` hat alles: Kamera, Video,
Kalibrierung, Session-Schreiber, Upload. Neu sind drei Bildschirme, der Plan-Abruf und
`capture.json`.

**Video, nicht Standbilder.** Beim Drehen entsteht ein durchgehender Schwenk — hunderte
Zwischenwinkel statt acht diskreter. Fuer eine Fehlermechanik, die an der Eigendrehung der Figur
haengt, ist das der Punkt der ganzen Uebung.

## Design (entschieden — nicht neu entwerfen)

Neues Paket `android/app/src/main/kotlin/com/chesslab/tracker/capture/`. **Kein neues Modul, kein
zweites APK, keine zweite Kamerabindung.**

### Aufnehmen ohne Partie — die Bausteine sind oeffentlich

Der bestehende AUFRUFPFAD haengt an einer Partie
(`GameSessionController.kt:223`: `capture.queue(game.moveCount, fenAfter, sans.last(), …)`), die
Bausteine aber nicht:

```kotlin
class SessionRecorder(val dir: File, private val meta: SessionMeta, …)       // :83, oeffentlich
fun capture(writer, ply: Int, fen: String, moveSan: String?, corners): String?  // :105-113
data class SessionMeta(sessionId, profile, frameWidth, frameHeight, notes, mode) // :10-19
```

`moveSan` ist **nullable**. Der Modus baut den Recorder selbst und ruft `capture` je Drehschritt:

```
host.armVideo()                       // RecordingBundleHost:74
recorder = SessionRecorder(sessions.create(id), SessionMeta(id, profileName(), w, h,
                                                            notes = shot.id, mode = "capture"))
host.opened(recorder)                 // :76 -> camera.keepVideo(dir/VIDEO_FILE), :84
  je Schritt: recorder.capture(writer, ply, fenOf(place), null, corners)
host.finished()                       // :102
```

`profileName()` ist derselbe Ausdruck wie im Partieweg: `profile()?.name ?: DEFAULT_PROFILE`
(`GameSessionWiring.kt:33,69`, `DEFAULT_PROFILE = "default"`). **Nicht** die exportierte
`session.yaml` abschreiben — die sagt `desktop` und meint etwas anderes.

**Nichts in `:tracker-runtime` aendern.** Wird dort doch etwas gebraucht: anhalten und melden.

### Der FEN je Ply

`fenOf` in `core-engine/board/ReadingFen.kt` baut den Brett-FEN schon, aber aus einem
`CnnSnapshot`, und `board.getValue(…)` (`:22`) **wirft** bei einer Teilkarte. Deshalb eine
ENTSCHEIDUNG, keine Verschiebung:

```kotlin
/** Feld ("h3") -> Label ("wQ"); was fehlt, ist leer. Der `CnnSnapshot`-Weg liefert immer alle
 *  64 Felder (`Reading.kt:6`, `BOARD_SQUARES`) und bleibt damit bitgleich. */
fun fenOf(board: Map<String, String>, blank: String = "empty"): String
```

`blank`, nicht `empty` — `empty` kollidiert mit dem lokalen Zaehler in `:19`.
`ply` = Schrittindex, `orientation_deg = ply * 45`.

### `capture.json`, geschrieben von dieser Phase

`docs/capture-session.schema.json` ist die Autoritaet und **liegt bereits** (geschrieben
2026-09-13, weil 01 und 03 dagegen bauen). Diese Phase implementiert sie, sie entwirft sie nicht.
Die Datei liegt im Buendel neben `log.jsonl`; Phase 01 bricht ohne sie ab, Phase 03 liest sie.

```json
{"shot_id": "wq-light-sehr-hell", "height": "normal", "reference_square": "h3",
 "steps": [{"ply": 0, "orientation_deg": 0,
            "elapsed_ns": 187635697284584, "elapsed_ns_end": 187638697284584, "t": 3.933}]}
```

Die Ausrichtung ist **deklariert**, nicht gemessen — die App hat zum Drehen aufgefordert.

**`elapsed_ns` ist Pflicht** — und es ist das, was das Geraet wirklich hat. Gemessen 2026-09-13:
einen Video-Frame-INDEX kennt die App nicht, der entsteht erst beim Dekodieren auf dem PC
(`PhoneCandidate.kt:550`, `RealGameCandidate.kt:31`). Ueber `app/`, `core-engine/` und
`tracker-runtime/` findet `grep videoFrame|frameIndex|frameNumber` genau einen Treffer, ein
Test-Fixture. Was die App fuehrt, ist ihre monotone Uhr, und `SessionTimeline` schreibt sie in
jede Zeile als `elapsedNs` — dazu `video_sync`-Zeilen mit `(elapsedNs, durationNs)`, aus denen
der Import die Videozeit interpoliert. Genau so laeuft der Partie-Import schon.

Dieser Schritt schreibt also je Drehschritt die Uhr am Anfang (`elapsed_ns`) und, wenn der Schritt
endet, am Ende (`elapsed_ns_end`). **Kein Zaehlen von Samples, kein Anfassen von `CameraVideo`** —
das „Do NOT" der Phase bleibt.

Ein Drehschritt ist STATISCH: die Figur steht still, der Import nimmt das ganze Fenster und ein
Frame Ungenauigkeit kostet nichts. Deshalb ist die Uhr genug und ein Index unnoetig.

### Plan holen

`HttpIngestClient.call()` ist privat und das `IngestClient`-Interface kennt nur
`hello`/`declare`/`putChunk`/`complete`. Der Plan-Abruf ist deshalb ein eigener, kleiner GET im
`capture`-Paket — Host und Token aus `SyncSettings.kt:33`, dieselbe Kopplung wie der Upload.
`Json { ignoreUnknownKeys = true }`, sonst wirft jeder Schluessel, den 00 spaeter ergaenzt.

Typen `Placement`, `Gap`, `Shot`, `CapturePlan` mit **allen** Schluesseln des Plan-Schemas;
`@SerialName` fuer `reference_square`, `square_color`, `corpus_in_band`, `generated_at`,
`gaps_from`.

### Bildschirme

`ChesslabNavHost.kt` ist die EINE Navigationstopologie („A second `NavHost` would give it two back
stacks") — die drei Ziele werden dort registriert, plus ein Einstiegspunkt.

| Bildschirm | Inhalt |
|---|---|
| Plan | Auftragsliste mit `reason` und `fix`, „Auftrag 3 von 10", Abdeckung **mit `generated_at`** |
| Aufbau | der Auftrag im Klartext, Kamerabild, Knopf „Aufbau steht" |
| Drehen | „Schritt 4 von 8 — 135 Grad", Knopf „Aufgenommen"; jeder Schritt wird **von Hand** quittiert |

Compose wie der Rest von `:app`: 12dp-Tokens, `contentDescription` an jedem Bedienelement.
Die Abdeckung stammt aus einem gebauten Datensatz und bewegt sich nach einem Upload nicht —
deshalb steht ihr Erzeugungszeitpunkt daneben.

## Steps

1. `fenOf(Map, blank)` oeffnen, `fenOf(snap)` ruft es → `feat(engine): den Brett-FEN aus einer Feldkarte`
2. Plan-Abruf und Typen → `feat(capture): Auftraege aus der Plan-Route`
3. Drei Bildschirme, im NavHost registriert → `feat(capture): Plan, Aufbau, Drehen`
4. Aufnahme je Ply mit Video und `capture.json` → `feat(capture): Aufbau als FEN je Drehschritt`

## Tests

`gradlew.bat :core-engine:test :app:test --rerun-tasks`:

- `fenOf(mapOf("h3" to "wQ"))` = `"8/8/8/8/8/7Q/8/8 w - - 0 1"`; leere Karte = leeres Brett.
- Fuer einen `CnnSnapshot`-Fall liefert `fenOf(snap)` **denselben String wie vor der Aenderung** —
  den Referenzwert VOR dem Umbau erzeugen und in den Test schreiben; es gibt heute keinen
  `ReadingFenTest`, ein nachtraeglich erzeugter Wert beweist nichts.
- Acht Schritte erzeugen acht `steps`; Ply 0 traegt 0 Grad, Ply 3 traegt 135.
- Leeres `place` (`fix = "Licht"`) erzeugt trotzdem acht Schritte mit dem Leerbrett-FEN.
- Ein Plan-JSON mit unbekanntem Zusatzschluessel wird gelesen statt geworfen; ein 401 ergibt eine
  sichtbare Kopplungs-Meldung, nicht eine leere Liste.
- **Integrationstest gegen den ECHTEN `SessionRecorder`** (`app/build.gradle.kts:228` hat
  `testFixtures(project(":tracker-runtime"))`): danach liegen `log.jsonl` mit acht Zeilen und
  aufsteigendem `ply`, `session.yaml` mit `mode: capture`, und `capture.json` mit acht `steps`.
- **Jeder `step` traegt ein `elapsed_ns`**, und die acht sind streng aufsteigend — der Test
  prueft das, sonst waere eine hartkodierte 0 gruen. `elapsed_ns_end` eines Schritts liegt nie
  hinter dem `elapsed_ns` des naechsten.

Dazu einmal `gradlew.bat :app:test --tests "*CommentBudgetTest*" --rerun-tasks`.

## Acceptance

- `gradlew.bat :app:assembleDebug :app:test :app:ktlintCheck :app:detekt --rerun-tasks` gruen.
- `grep -rn "bindToLifecycle" android/app/src/main/ | wc -l` gibt **1** (heute 1 — diese Phase
  darf die Zahl nicht aendern).
- `grep -rln "w - - 0 1" android/*/src/main/ --include=*.kt` nennt nur `ReadingFen.kt`.
- `git diff --name-only` nennt **keine** Datei unter `android/tracker-runtime/`.
- Eine aufgenommene Session laeuft durch `chesslab capture import` und hinterlaesst `boards/`.

## Do NOT

- Kein neues Modul, keine zweite Kamerabindung, kein eigener Session-Schreiber, kein eigener
  Upload, kein eigener FEN-Bauer, kein `ImageCapture`.
- `TrackerCamera`, `CameraVideo`, `ArucoCalibrator`, `SessionRecorder` nicht umbauen — nur benutzen.
- Keinen zweiten `NavHost`.
- Keinen Abdeckungszaehler auf dem Geraet fuehren.
