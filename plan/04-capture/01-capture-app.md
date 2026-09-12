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
| Session schreiben | `:tracker-runtime` | `record/SessionRecorder.kt`: `frames/%04d.jpg` (`:114`), `log.jsonl` (`:89`), `session.yaml` (`:176`), `corners` `[a8,h8,h1,a1]` (`:70-72`) |
| Upload, Kopplung | `:tracker-runtime` | `sync/HttpIngestClient.kt`, `sync/SyncSettings.kt` |
| Geometrie | `:core-geometry` | `Aruco`, `Corners`, `QuadRefine`, `GridCorrection`, `GridLines`, `ProjectiveFit`, `Warp`, `Crops` |
| **Kamera** | **selbst** | siehe unten |

**Kamera: eigene, minimale Bindung** — alle neun CameraX-Dateien liegen in `:app`, das kein Modul
einbinden kann. Preview plus Einzelbild, **genau ein** `bindToLifecycle`; „EIN Kamera-Besitzer"
gilt je Prozess. Die Governors (`ExposureGovernor.kt`, `FocusGovernor.kt`) liegen in
`:tracker-runtime` und waeren erreichbar, bleiben aber draussen: eine stehende Stellung braucht
keine Nachfuehrung. Entscheidung, keine Unmoeglichkeit.

**Kalibrier-Ablauf nachgebaut:** `ArucoCalibrator` liegt in `:app` und ist nicht erreichbar, also
ruft `:capture` die `:core-geometry`-Bausteine selbst der Reihe nach auf — doppelte ABLAUFLOGIK,
keine doppelte Mathematik. Als Schuld in `STATUS.md` notieren.

### Der FEN je Schritt — der Kern dieser Phase

`SessionRecorder.capture(writer, ply, fen, moveSan, corners)` will einen FEN. Ein gezielter Aufbau
IST einer: leeres Brett plus die Figuren aus `place`.

```kotlin
/** `place` -> Brett-FEN. Nachgemessen: GameState("8/8/8/8/8/7Q/8/8 w - - 0 1").label_for("h3")
 *  gibt `wQ`, also labelt der bestehende Slice-Pfad die Aufnahme ohne Sonderweg. */
fun fenOf(place: List<Placement>): String
```

`ply` = Index des Drehschritts, **0-basiert und 0 Grad bei Schritt 0** (`orientation_deg = ply * 45`).
`moveSan` = `null`.

`SessionMeta`, alle sechs: `sessionId` = `yyyyMMdd-HHmmss` wie `:app` (gemessen: der Bundle von
`2026-09-06-21-29-35` liegt unter `files/sessions/20260906-212935/`), `frameWidth`/`frameHeight`
aus der Bildgroesse, `notes` = die `id` des Auftrags, `mode = "track"`, `profile` woertlich aus
`data/recordings/2026-09-06-21-29-35/session.yaml`.

**Wie daraus eine Aufnahme wird** (der Schritt, den niemand erfinden darf): der Ingest legt den
Bundle unter `data/recordings/<name>/files/sessions/<id>/` ab (`platform/app/lib/ingest.ts:98`).
`realgames.stored_session_dirs` (`realgames.py:1963`) liest genau dort, `chesslab realgames
fit-stored` fittet den Quad nach, und `export-session` schreibt `boards/` samt oberem `log.jsonl`.
Das ist der bestehende Weg jeder Handy-Aufnahme; `:capture` erfindet daran nichts.

### `capture.json` — von DIESER Phase geschrieben, mit eigenem Schema

`docs/capture-session.schema.json` (neu, gehoert 01) ist die Autoritaet; 02 liest dagegen. Die
Datei liegt NEBEN `log.jsonl` im Bundle, also unter `files/sessions/<id>/`.

```json
{"id": "wq-light-sehr-hell", "height": "normal", "light": null,
 "steps": [{"frame": "frames/0000.jpg", "orientation_deg": 0,
            "place": [{"square": "h3", "piece": "wQ"}]}]}
```

`frame` ist der **Pfad wie in `log.jsonl`**; der Verbund mit einer Manifestzeile laeuft ueber den
Stamm (`Path(frame).stem`), weil das Manifest `"0000"` traegt.

Die Ausrichtung ist **deklariert**, nicht gemessen — die App hat zum Drehen aufgefordert.

### Typen und Ablauf

```kotlin
@Serializable data class Placement(val square: String, val piece: String)
@Serializable data class Gap(
    val piece: String, @SerialName("square_color") val squareColor: String,
    val band: String, val have: Int, val fix: String,
    @SerialName("corpus_in_band") val corpusInBand: Int)
/** Alle NEUN Schluessel des Schemas; `@SerialName` haelt die Namen der JSON-Seite. */
@Serializable data class Shot(
    val id: String, val fix: String, val reason: String, val place: List<Placement>,
    val light: String?, @SerialName("reference_square") val referenceSquare: String,
    val height: String, val orientations: Int, val closes: List<Gap>)
@Serializable data class CapturePlan(
    @SerialName("generated_at") val generatedAt: String, val dataset: String,
    @SerialName("gaps_from") val gapsFrom: String, val shots: List<Shot>)
```

`Json { ignoreUnknownKeys = true }` — sonst wirft `kotlinx.serialization` bei jedem Schluessel,
den 00 spaeter ergaenzt.

### Oberflaeche

Compose wie `:app`, Abstaende auf 12dp-Tokens, jedes Bedienelement mit `contentDescription`
(CLAUDE.md). Drei Bildschirme, mehr nicht:

| Bildschirm | Inhalt |
|---|---|
| Plan | Liste der Auftraege, je Zeile `reason` und `fix`; oben „Auftrag 3 von 10"; Abdeckung als Text mit `generated_at` |
| Aufbau | der Auftrag im Klartext („Dame auf h3, Hoehe normal"), Kamera-Preview, ein Knopf „Aufbau steht" |
| Drehen | „Schritt 4 von 8 — 135 Grad", Preview, ein Knopf „Aufgenommen"; der Nutzer quittiert JEDEN Schritt von Hand, es gibt keinen Timer |

Plan holen → Auftrag zeigen → je Drehschritt ein Einzelbild mit FEN → `capture.json` schreiben →
`HttpIngestClient` hochladen → naechster Auftrag. Die App zeigt **Fortschritt gegen den Plan**
(„Auftrag 3 von 10"); die Abdeckung kommt von `GET /api/capture/coverage` **mit `generated_at`**
und bewegt sich nach einem Upload nicht.

## Steps

1. Modul, Manifest, Gradle, OpenCV-Runtime → `feat(capture): eigenes Modul fuer die Erfassung`
   (detekt erwartet `config/detekt/baseline-capture.xml`, `android/build.gradle.kts:29` — eine
   FEHLENDE Baseline ist zulaessig und bleibt es; keine anlegen, um gruen zu werden)
2. Kamerabindung, Preview, Einzelbild → `feat(capture): Preview und Einzelbildaufnahme`
3. Plan holen, Typen, 401 sichtbar machen → `feat(capture): Auftraege aus der Plan-Route`
4. Geometrie aus `:core-geometry` → `feat(capture): Brettgeometrie ohne eigene Mathematik`
5. `fenOf` + Aufnahme je Drehschritt → `feat(capture): Aufbau als FEN je Drehschritt`
6. `capture.json` → `feat(capture): Hoehe und Ausrichtung mitschreiben`
7. Upload → `feat(capture): Session ueber den bestehenden Ingest`

## Tests

`gradlew.bat :capture:test --rerun-tasks`:

- `fenOf(listOf(Placement("h3","wQ")))` gibt `"8/8/8/8/8/7Q/8/8 w - - 0 1"`; Schritt 0 traegt
  `orientation_deg = 0`, Schritt 3 traegt 135; `orientations = 8` erzeugt acht `steps`.
- Ein Plan-JSON mit unbekanntem Zusatzschluessel wird gelesen statt geworfen.
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
