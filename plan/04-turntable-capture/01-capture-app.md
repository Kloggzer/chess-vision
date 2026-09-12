# Phase 01 — Android-Modul `:capture`

## Why

Die Aufnahme soll dem Plan folgen. Die Tracker-App kann das nicht nebenbei: sie verfolgt eine
Partie, hier steht eine Stellung still und wird gedreht.

## Design (entschieden — nicht neu entwerfen)

Neues Gradle-Modul `:capture`, `com.android.application`, `applicationId com.chesslab.capture`,
eine Zeile `include(":capture")` in `android/settings.gradle.kts` (dort stehen neun; `compileSdk`,
Compose und die OpenCV-Runtime von `:app` uebernehmen — ohne Letztere fehlen 342 Klassen).

### Was wiederverwendet wird — und was NICHT

| Braucht | Woher | Anker |
|---|---|---|
| Session schreiben | `:tracker-runtime` (reines JVM) | `record/SessionRecorder.kt`: `frames/%04d.jpg` (`:114`), `log.jsonl` (`:89`), `session.yaml` (`:176`), `corners` als `[a8,h8,h1,a1]` (`:70-72`) |
| Upload und Kopplung | `:tracker-runtime` | `sync/HttpIngestClient.kt`, `sync/SyncSettings.kt` |
| Ecken, Verfeinerung, Warp, Zellschnitt | `:core-geometry` | `Aruco.kt`, `Corners.kt`, `QuadRefine.kt`, `GridCorrection.kt`, `GridLines.kt`, `ProjectiveFit.kt`, `Warp.kt`, `Crops.kt` |
| **Kamera** | **selbst** | siehe unten |

**Kamera: eigene, minimale Bindung.** Alle neun CameraX-Dateien liegen in `:app`, und ein
Application-Modul kann kein anderes einbinden. `:capture` bindet Preview plus Einzelbild, **genau
ein** `bindToLifecycle`. Die Regel „EIN Kamera-Besitzer" gilt je Prozess.
Die Governors (`ExposureGovernor.kt`, `FocusGovernor.kt`) liegen zwar in `:tracker-runtime` und
waeren erreichbar — sie bleiben trotzdem draussen, weil eine stehende Stellung keine Nachfuehrung
braucht. Das ist eine Entscheidung, keine Unmoeglichkeit.

**Kalibrier-Ablauf: nachgebaut.** `ArucoCalibrator` liegt in `:app`
(`app/src/main/kotlin/com/chesslab/tracker/geometry/ArucoCalibrator.kt`) und ist nicht erreichbar.
`:capture` ruft die Bausteine aus `:core-geometry` selbst der Reihe nach auf — doppelte
ABLAUFLOGIK, keine doppelte Mathematik. Als Schuld in `STATUS.md` notieren.

### Der FEN je Schritt — der Kern dieser Phase

`SessionRecorder.capture(writer, ply, fen, moveSan, corners)` will einen FEN. Ein gezielter Aufbau
IST einer: leeres Brett plus die Figuren aus `place`.

```kotlin
/** `place` -> Brett-FEN. Nachgemessen: GameState("8/8/8/8/8/7Q/8/8 w - - 0 1").label_for("h3")
 *  gibt `wQ`, also labelt der bestehende Slice-Pfad die Aufnahme ohne Sonderweg. */
fun fenOf(place: List<Placement>): String
```

`ply` = Index des Drehschritts (0-basiert), `moveSan` = `null`. `SessionMeta`: `profile` wie `:app`
es fuer diese Kamera setzt (aus `session.yaml` einer bestehenden Aufnahme ablesen), `mode = "track"`.

### `capture.json` — von DIESER Phase geschrieben

Neben `log.jsonl`, gelesen von Phase 02. `place` hat **dieselbe Form wie im Schema**:

```json
{"id": "wq-light-sehr-hell", "height": "normal", "light": null,
 "steps": [{"frame": "frames/0000.jpg", "orientation_deg": 45,
            "place": [{"square": "h3", "piece": "wQ"}]}]}
```

Die Ausrichtung ist **deklariert**, nicht gemessen — die App hat zum Drehen aufgefordert.

### Typen und Ablauf

```kotlin
@Serializable data class Placement(val square: String, val piece: String)
/** Alle NEUN Schluessel des Schemas; `@SerialName` haelt die Namen der JSON-Seite. */
@Serializable data class Shot(
    val id: String, val fix: String, val reason: String, val place: List<Placement>,
    val light: String?, @SerialName("reference_square") val referenceSquare: String,
    val height: String, val orientations: Int, val closes: List<Gap>)
```

Plan holen → Auftrag zeigen → je Drehschritt ein Einzelbild mit FEN → `capture.json` schreiben →
`HttpIngestClient` hochladen → naechster Auftrag. Die App zeigt **Fortschritt gegen den Plan**
(„Auftrag 3 von 10"); die Abdeckung kommt von `GET /api/capture/coverage` **mit `generated_at`**
und bewegt sich nach einem Upload nicht.

## Steps

1. Modul, Manifest, Gradle, OpenCV-Runtime → `feat(capture): eigenes Modul fuer die Erfassung`
2. Kamerabindung, Preview, Einzelbild → `feat(capture): Preview und Einzelbildaufnahme`
3. Plan holen, Typen, 401 sichtbar machen → `feat(capture): Auftraege aus der Plan-Route`
4. Geometrie aus `:core-geometry` → `feat(capture): Brettgeometrie ohne eigene Mathematik`
5. `fenOf` + Aufnahme je Drehschritt → `feat(capture): Aufbau als FEN je Drehschritt`
6. `capture.json` → `feat(capture): Hoehe und Ausrichtung mitschreiben`
7. Upload → `feat(capture): Session ueber den bestehenden Ingest`

## Tests

`gradlew.bat :capture:test --rerun-tasks`:

- `fenOf(listOf(Placement("h3","wQ")))` gibt `"8/8/8/8/8/7Q/8/8 w - - 0 1"`.
- `orientations = 8` erzeugt acht Schritte und acht `steps` in `capture.json`.
- Leeres `place` (`fix="Licht"`) ergibt den FEN des leeren Bretts und trotzdem acht Schritte.
- Ein 401 der Plan-Route fuehrt zu einer sichtbaren Kopplungs-Meldung, nicht zu einer leeren Liste.
- **Integrationstest gegen die ECHTE `HttpIngestClient`** und einen lokalen Fake-Server: eine
  Session geht durch Handshake, Chunk und Complete; danach liegen `log.jsonl`, `session.yaml`,
  `frames/0000.jpg` und `capture.json`.

Dazu einmal `gradlew.bat :app:test --tests "*CommentBudgetTest*" --rerun-tasks` — der Ratchet
laeuft ueber den ganzen `android/`-Baum und faellt sonst erst beim Orchestrator auf.

## Acceptance

- `gradlew.bat :capture:assembleDebug --rerun-tasks` baut.
- `gradlew.bat :capture:ktlintCheck :capture:detekt --rerun-tasks` ohne NEUE Befunde.
- `grep -rn "bindToLifecycle" android/capture/src/main/ | wc -l` gibt **1**.
- `grep -rn "class SessionRecorder\|class HttpIngestClient\|fun warp\|fun refineQuad" android/capture/`
  trifft nichts — nichts davon ist kopiert.
- `grep -rn "turntable" android/capture/` trifft nichts (der Name gehoert dem Drehteller).

## Do NOT

- Keine Datei in `:app`, `:tracker-runtime`, `:core-geometry`, `:core-cnn` aendern. Fehlt dort
  etwas, in `STATUS.md` melden und **anhalten**.
- Kein CNN-Aufbau-Check in dieser Fassung: das Modell laege in `:app/src/main/assets/cnn_model/`
  und ist nicht erreichbar. Spaetere Phase, wenn ueberhaupt.
- Kein eigener Session-Schreiber, kein eigener Upload, keine eigene Geometrie-Mathematik.
- Keinen Abdeckungszaehler auf dem Geraet fuehren.
