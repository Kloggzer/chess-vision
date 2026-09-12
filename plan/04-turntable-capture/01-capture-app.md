# Phase 01 — Android-Modul `:capture`, eigenes APK

## Why

Die Aufnahme soll dem Plan folgen, statt ihn auf einem Zettel zu haben. Die Tracker-App kann das
nicht nebenbei: sie verfolgt eine Partie, hier steht eine Stellung still und wird gedreht.

**Nichts davon wird neu gebaut.** Kamera, Kalibrierung, Brettschnitt und Upload existieren.

## Design (entschieden — nicht neu entwerfen)

Neues Gradle-Modul `:capture` als eigene Anwendung, eine Zeile `include(":capture")` in
`android/settings.gradle.kts` (dort stehen heute neun Module, Muster übernehmen).

Abhängigkeiten **nur** auf bestehende Module:

| Braucht | Kommt aus | Anker |
|---|---|---|
| Kamera, Belichtung, Schärfe | `:tracker-runtime` | `camera/BoardExposure.kt`, `camera/BoardSharpness.kt` |
| Ecken, Grid-Fit, Zellschnitt | `:core-geometry` | `Aruco.kt`, `Corners.kt`, `Crops.kt` |
| Upload zur Platform | `:tracker-runtime` | `sync/HttpIngestClient.kt` |
| optionaler Aufbau-Check | `:core-cnn` bzw. `:tracker-runtime` | `cnn/OnnxSquareClassifier.kt`, `cnn/CnnObserver.kt` |

Ein Bildschirm, drei Zustände:

```kotlin
sealed interface CaptureStep {
    data class Setup(val shot: Shot, val checked: BoardCheck?) : CaptureStep
    data class Turning(val shot: Shot, val step: Int, val total: Int) : CaptureStep
    data class Uploading(val session: String, val percent: Int) : CaptureStep
}

/** Was das CNN zum Aufbau sagt. `null` = nicht gefragt; der Check ist OPTIONAL. */
data class BoardCheck(val matches: Boolean, val wrong: List<String>)
```

`Shot` wird aus dem JSON von Phase 00 gelesen — **dieselben Schlüssel**, kein eigenes Modell.

Ablauf: Plan von `GET /api/turntable/plan` holen → Auftrag anzeigen („Dame auf h3, Licht sehr
hell, Höhe normal") → optional CNN fragen, ob der Aufbau passt → je Ausrichtungsschritt ein
Standbild aufnehmen → Session über `HttpIngestClient` hochladen → nächster Auftrag.

**Die Abdeckung in Echtzeit** ist `GET /api/turntable/coverage`, nach jedem Upload neu geholt und
als Balken je offener Lücke gezeigt. Kein eigener Zähler auf dem Gerät — die Wahrheit liegt beim
Korpus, nicht beim Telefon.

Die Session wird als das geschrieben, was der Ingest schon versteht (`boards/*.webp` plus
`log.jsonl`), dazu die Datei aus Phase 02. Formate: `grep -rn "log.jsonl" android/ --include=*.kt`.

## Steps

1. Modul, Manifest, Gradle, leere Activity → `feat(capture): eigenes Modul fuer die Erfassung`
2. Plan holen und anzeigen, Typen aus Phase 00 → `feat(capture): Auftraege aus der Plan-API`
3. Aufnahme je Ausrichtungsschritt → `feat(capture): Standbilder je Drehschritt`
4. Upload über `HttpIngestClient` → `feat(capture): Session ueber den bestehenden Ingest`
5. Optionaler CNN-Aufbau-Check → `feat(capture): optionaler Abgleich des Aufbaus`
6. Abdeckungsbalken → `feat(capture): Abdeckung nach jedem Upload`

## Tests

`android/capture/src/test/kotlin/.../CaptureFlowTest.kt` —
`gradlew.bat :capture:test --rerun-tasks`:

- Ein Auftrag mit `orientations = 8` erzeugt acht Schritte, nicht sieben oder neun.
- Ein Auftrag mit leerem `place` (`fix = "Licht"`) überspringt den CNN-Check.
- `BoardCheck(matches = false)` blockiert die Aufnahme nicht — der Check ist ein Hinweis.
- **Integrationstest gegen die ECHTE `HttpIngestClient`**, gegen einen lokalen Fake-Server:
  eine Session geht vollständig durch Handshake, Chunk und Complete.

## Acceptance

- `gradlew.bat :capture:assembleDebug --rerun-tasks` baut.
- `gradlew.bat :capture:ktlintCheck :capture:detekt --rerun-tasks` ohne NEUE Befunde.
- `grep -rn "CameraX\|bindToLifecycle" android/capture/` zeigt genau EINE Bindung.
- `grep -rn "class HttpIngestClient\|fun warpPadded\|object Aruco" android/capture/` trifft
  nichts — nichts davon ist kopiert.

## Do NOT

- Keine Datei in `:app`, `:tracker-runtime`, `:core-geometry` ändern. Fehlt dort etwas,
  in `STATUS.md` melden und anhalten.
- Keine zweite Kalibrierung, kein eigener Grid-Fit, kein eigener Upload.
- Keine Schreib-Route zur Platform erfinden.
