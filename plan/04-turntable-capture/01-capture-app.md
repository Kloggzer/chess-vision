# Phase 01 — Android-Modul `:capture`

## Why

Die Aufnahme soll dem Plan folgen. Die Tracker-App kann das nicht nebenbei: sie verfolgt eine
Partie, hier steht eine Stellung still und wird gedreht.

## Design (entschieden — nicht neu entwerfen)

Neues Gradle-Modul `:capture`, `com.android.application`, eigener `applicationId`
(`com.chesslab.capture`), eine Zeile `include(":capture")` in `android/settings.gradle.kts`
(dort stehen neun; Muster von `:app` uebernehmen, inklusive `compileSdk` und Compose).

### Was wiederverwendet wird — und was NICHT

| Braucht | Woher | Anker |
|---|---|---|
| Session schreiben | `:tracker-runtime` (reines JVM) | `record/SessionRecorder.kt` — schreibt `frames/%04d.jpg` (`:114`), `log.jsonl` (`:89`), `session.yaml` (`:176`) |
| Upload | `:tracker-runtime` | `sync/HttpIngestClient.kt`, Kopplung wie `sync/SyncSettings.kt` |
| Ecken, Zellschnitt, Warp | `:core-geometry` | `Aruco.kt`, `Corners.kt`, `QuadRefine.kt`, `GridCorrection.kt`, `GridLines.kt`, `ProjectiveFit.kt`, `Warp.kt`, `Crops.kt` |
| optionaler Aufbau-Check | `:tracker-runtime` | `cnn/OnnxSquareClassifier.kt` (das Interface liegt in `:core-cnn`) |
| **Kamera** | **selbst**, siehe unten | — |

**Die Kamera wird NICHT wiederverwendet, weil es sie hier nicht gibt.** `:tracker-runtime` ist
`java-library` (`build.gradle.kts:2`) und traegt null CameraX-Dateien; alle neun liegen in `:app`,
und ein Application-Modul kann kein anderes als Abhaengigkeit einbinden. `:capture` schreibt eine
eigene, minimale Bindung: Preview plus Einzelbild, **genau ein** `bindToLifecycle`. Die Regel
„EIN Kamera-Besitzer" gilt je Prozess; ein eigenes APK ist ein eigener Prozess. Die Governors aus
`:app` (`camera/ExposureGovernor.kt`, `FocusGovernor.kt`) werden **nicht** nachgebaut — eine
stehende Stellung braucht keine Nachfuehrung.

**Ebenso die Kalibrier-Orchestrierung.** `ArucoCalibrator` liegt in `:app`
(`app/src/main/kotlin/com/chesslab/tracker/geometry/ArucoCalibrator.kt`) und ist nicht erreichbar.
`:capture` ruft die Bausteine aus `:core-geometry` selbst der Reihe nach auf. Das ist bewusst
doppelte ABLAUFLOGIK, keine doppelte Geometrie — und es gehoert in `STATUS.md` als Schuld notiert.

**OpenCV:** `:core-geometry` ist `compileOnly` gegen `org.bytedeco:opencv`
(`core-geometry/build.gradle.kts:8-20`). `:capture` muss wie `:app` das `org.opencv`-AAR plus
Natives liefern, sonst fehlen zur Laufzeit 342 Klassen.

### Ablauf und Typen

```kotlin
/** Abgeschrieben aus `docs/turntable-plan.schema.json` - das Schema ist die Autoritaet, nicht
 *  die TypeScript- und nicht diese Kotlin-Fassung. */
data class Shot(val id: String, val fix: String, val place: List<Placement>,
                val light: String?, val referenceSquare: String,
                val height: String, val orientations: Int)

sealed interface CaptureStep {
    data class Setup(val shot: Shot, val checked: BoardCheck?) : CaptureStep
    data class Turning(val shot: Shot, val step: Int, val total: Int) : CaptureStep
    data class Uploading(val session: String, val percent: Int) : CaptureStep
}
/** Was das CNN zum Aufbau sagt. `null` = nicht gefragt; der Check ist OPTIONAL und blockiert nie. */
data class BoardCheck(val matches: Boolean, val wrong: List<String>)
```

Plan holen → Auftrag zeigen → optional CNN fragen → je Ausrichtungsschritt ein Einzelbild →
`SessionRecorder` schliessen → `HttpIngestClient` hochladen → naechster Auftrag.

**Fortschritt, nicht Abdeckung.** Die App zeigt „Auftrag 3 von 10" aus dem Plan. Die Abdeckung
kommt von `GET /api/turntable/coverage` **mit ihrem `generated_at`** und aendert sich nach einem
Upload nicht — sie stammt aus einem gebauten Datensatz. Kein Balken, der Bewegung vortaeuscht.

## Steps

1. Modul, Manifest, Gradle, OpenCV-Runtime → `feat(capture): eigenes Modul fuer die Erfassung`
2. Kamerabindung, Preview, Einzelbild → `feat(capture): Preview und Einzelbildaufnahme`
3. Plan holen und anzeigen → `feat(capture): Auftraege aus der Plan-Route`
4. Geometrie: Ecken, Verfeinerung, Zellschnitt → `feat(capture): Brettgeometrie aus core-geometry`
5. Aufnahme je Drehschritt in `SessionRecorder` → `feat(capture): Einzelbilder je Drehschritt`
6. Upload → `feat(capture): Session ueber den bestehenden Ingest`
7. Optionaler CNN-Check → `feat(capture): optionaler Abgleich des Aufbaus`

## Tests

`gradlew.bat :capture:test --rerun-tasks`:

- `orientations = 8` erzeugt acht Schritte, nicht sieben oder neun.
- Leeres `place` (`fix = "Licht"`) ueberspringt den CNN-Check.
- `BoardCheck(matches = false)` blockiert die Aufnahme **nicht**.
- Ein 401 der Plan-Route fuehrt zu einer sichtbaren Kopplungs-Meldung, nicht zu einer leeren Liste.
- **Integrationstest gegen die ECHTE `HttpIngestClient`** und einen lokalen Fake-Server: eine
  Session geht durch Handshake, Chunk und Complete; `SessionRecorder` hat `log.jsonl`,
  `session.yaml` und `frames/0000.jpg` geschrieben.

## Acceptance

- `gradlew.bat :capture:assembleDebug --rerun-tasks` baut.
- `gradlew.bat :capture:ktlintCheck :capture:detekt --rerun-tasks` ohne NEUE Befunde.
- `grep -rc "bindToLifecycle" android/capture/src/main/` summiert zu **1**.
- `grep -rn "class SessionRecorder\|class HttpIngestClient\|object Corners\|fun warp" android/capture/`
  trifft nichts — nichts davon ist kopiert.

## Do NOT

- Keine Datei in `:app`, `:tracker-runtime`, `:core-geometry`, `:core-cnn` aendern. Fehlt dort
  etwas, in `STATUS.md` melden und **anhalten**.
- Kein eigener Session-Schreiber, kein eigener Upload, keine eigene Geometrie-Mathematik.
- Keine Schreib-Route zur Platform erfinden. Keinen Abdeckungszaehler auf dem Geraet fuehren.
