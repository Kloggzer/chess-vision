# Phase 01 — Extraktion statt Duplikat

## Why

Die urspruengliche Fassung liess `:capture` eine eigene Kamerabindung, einen eigenen
Kalibrier-Ablauf und einen eigenen FEN-Bauer schreiben — drei zweite Implementierungen, damit
`:app` unangetastet bleibt. Das ist die falsche Abwaegung: gemessen sind es 139 Zeilen
Kalibrierung, rund 80 Zeilen Bindung und ein `fenOf`, **das es bereits gibt**.

**Diese Phase fasst `:app` an.** Sie ist die einzige, die das darf, und sie aendert kein Verhalten.

## Design (entschieden — nicht neu entwerfen)

### `fenOf` nicht neu bauen — oeffnen

`android/core-engine/src/main/kotlin/com/chesslab/engine/board/ReadingFen.kt` baut den Brett-FEN
schon, aus einer Feld-zu-Label-Zuordnung samt Leerfeld-Zaehlung und `symbolOf`. Die Zuordnung
kommt dort aus einem `CnnSnapshot`. Aufspalten, **ohne die Rechnung anzufassen**:

```kotlin
/** Feld ("h3") -> Label ("wQ" oder "empty") in einen Brett-FEN. Der Weg ueber `CnnSnapshot`
 *  ruft das hier auf; gerechnet wird nur noch einmal. */
fun fenOf(board: Map<String, String>): String

fun fenOf(snap: CnnSnapshot): String? =
    Reading.of(snap)?.let { fenOf(/* seine Zuordnung */) }
```

`:core-engine` ist `java-library`, also von `:capture` aus erreichbar. Kein neuer FEN-Code.

### Neues Modul `:board-setup` (`com.android.library`)

`ArucoCalibrator` kann **nicht** nach `:core-geometry`: er braucht `android.graphics.Bitmap` und
`org.opencv.android.Utils`, und `:core-geometry` ist bewusst reines JVM
(`core-geometry/build.gradle.kts:8-21`). Also ein Android-Library-Modul dazwischen, das beide Apps
benutzen — `:app` bekommt keinen zweiten Kalibrierer, `:capture` keinen ersten eigenen.

| Datei | woher | wie |
|---|---|---|
| `ArucoCalibrator.kt` | `:app/.../geometry/` | **woertlich verschoben**, nur `package` geaendert |
| `BoardCamera.kt` | aus `:app/.../camera/TrackerCamera.kt` | die `ImageAnalysis`-Bindung (um `:245-266`) herausgeloest |

`BoardCamera` ist das kleinste gemeinsame Stueck: **eine** `ImageAnalysis`, YUV, KEEP_ONLY_LATEST,
**ein** `bindToLifecycle`, Frames an einen Rueckruf. Nicht mitwandern: `OpticsLock`, `PreRollRing`,
`ReconnectPolicy`, `TorchLamp`, `CameraVideo`, `ResolutionMismatchLogger` — die sind Tracker-Sache.

```kotlin
class BoardCamera(private val onFrame: (ImageProxy) -> Unit) {
    fun bind(owner: LifecycleOwner, selector: CameraSelector, size: Size)
    fun close()
}
```

**Ein Standbild ist das zuletzt gelieferte Analysebild.** `:app` bindet heute keinen
`ImageCapture` (`TrackerCamera.kt:245-266` ist die einzige Bindung), und `:capture` braucht
deshalb auch keinen. Wer hier einen hinzufuegt, hat ein zweites Kameramuster gebaut.

### `:app` zieht danach von dort

`ui/camera/BoardMode.kt:50` konstruiert `ArucoCalibrator(host.latestCalibrationFrame, store::geometry)`
— nur der Import aendert sich. `TrackerCamera` behaelt seine Aufgaben und delegiert die Bindung.
**Kein Verhalten aendert sich**, und das ist das Abnahmekriterium.

## Steps

1. `fenOf(Map)` aufspalten, `fenOf(snap)` ruft es → `feat(engine): den Brett-FEN einmal rechnen`
2. Modul `:board-setup`, `include` in `settings.gradle.kts` → `feat(board-setup): Modul fuer die geteilte Kamera und Kalibrierung`
3. `ArucoCalibrator` woertlich verschieben, `:app` importiert von dort → `refactor(app): Kalibrierer nach board-setup`
4. `BoardCamera` aus `TrackerCamera` herausloesen, `:app` delegiert → `refactor(app): die Kamerabindung teilen`

## Tests

- `gradlew.bat :core-engine:test --rerun-tasks`: `fenOf(mapOf("h3" to "wQ"))` gibt
  `"8/8/8/8/8/7Q/8/8 w - - 0 1"`; und fuer einen bestehenden `CnnSnapshot`-Fall liefert
  `fenOf(snap)` **denselben String wie vor der Aufspaltung** (der Wert gehoert in den Test, nicht
  in eine Behauptung).
- `gradlew.bat :board-setup:test --rerun-tasks`: `BoardCamera.bind` bindet genau einmal und
  `close` loest genau einmal — gegen einen Fake-Provider.
- `gradlew.bat :app:test --rerun-tasks` **vollstaendig gruen**. Das ist der eigentliche Test
  dieser Phase: Verschieben ohne Verhaltensaenderung.

## Acceptance

- `grep -rn "class ArucoCalibrator" android/` trifft **genau einmal**, in `:board-setup`.
- `grep -rn "bindToLifecycle" android/app/ android/board-setup/ | wc -l` gibt **1**.
- `grep -rn "\"\$ranks w - - 0 1\"\|w - - 0 1" android/ --include=*.kt` trifft nur `ReadingFen.kt`.
- `gradlew.bat :app:assembleDebug :app:test :app:ktlintCheck :app:detekt --rerun-tasks` gruen.

## Do NOT

- **Kein Verhalten aendern.** Verschieben heisst verschieben: gleiche Zeilen, anderer `package`.
  Faellt beim Herausloesen von `BoardCamera` auf, dass es ohne Umbau nicht geht — **anhalten** und
  in `STATUS.md` schreiben, nicht umbauen.
- Nichts aus `OpticsLock`, `PreRollRing`, `ReconnectPolicy`, `TorchLamp`, `CameraVideo` mitnehmen.
- Keinen `ImageCapture` einfuehren.
- `:core-geometry` bleibt reines JVM — nichts Android-Abhaengiges hineinlegen.
