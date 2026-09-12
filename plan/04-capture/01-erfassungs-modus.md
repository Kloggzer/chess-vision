# Phase 01 — Erfassungs-Modus in `:app`

## Why

Die Aufnahme soll dem Plan folgen statt einem Zettel. `:app` hat alles dafuer: Kamera, Video,
Kalibrierung, Session-Schreiber und Upload. Neu sind drei Bildschirme, der Plan-Abruf und eine
Datei — mehr nicht.

## Design (entschieden — nicht neu entwerfen)

Neues Paket `android/app/src/main/kotlin/com/chesslab/tracker/capture/`. **Kein neues Modul, kein
zweites APK.** Die Aufnahme laeuft wie jede andere: derselbe `TrackerCamera`, dasselbe Video,
derselbe `SessionRecorder`, derselbe `HttpIngestClient`. Damit traegt der bestehende Weg
(Ingest → `realgames.stored_session_dirs` (`realgames.py:1963`) → `fit-stored` → `export-session`)
die Aufnahme ohne Sonderfall — **das ist der Grund fuer den Modus statt eines eigenen Programms.**

### Die einzige Aenderung ausserhalb des neuen Pakets: `fenOf` oeffnen

`android/core-engine/.../board/ReadingFen.kt` baut den Brett-FEN schon, aber aus einem
`CnnSnapshot`, und `board.getValue("$file$rank")` (`:23`) **wirft** bei einer Teilkarte. Ein
Aufbau nennt nur die gesetzten Figuren. Deshalb eine ENTSCHEIDUNG, keine reine Verschiebung:

```kotlin
/** Feld ("h3") -> Label ("wQ") in einen Brett-FEN; was fehlt, ist leer. Der `CnnSnapshot`-Weg
 *  liefert immer alle 64 Felder und bleibt damit bitgleich. */
fun fenOf(board: Map<String, String>, empty: String = "empty"): String
```

`fenOf(snap)` ruft es mit der Karte, die es heute selbst baut (`ReadingFen.kt:13-16`). Gerechnet
wird danach **einmal**, und der Test haelt fest, dass der Snapshot-Weg denselben String liefert
wie vorher.

### Der Ply ist der Schluessel, nicht der Frame

`SessionRecorder.capture(writer, ply, fen, moveSan, corners)` (`:107-113`). Ein Drehschritt ist ein
**Ply**: `ply` = Schrittindex, `orientation_deg = ply * 45`, `moveSan = null`, `fen` = der Aufbau.

Der Export nummeriert Frames um — das Buendel traegt `frames/0000.jpg` (`SessionRecorder.kt:114`),
das exportierte Log `frames/000117.png` (`realgames.py:380`). **Ueber Frame-Namen darf man deshalb
nichts verbinden.** `ply` ueberlebt den Export und steht in jeder Manifestzeile (nachgemessen:
`{"frame": "003222", "ply": 12, "square": "a1"}`). Phase 02 verbindet darueber.

### `capture.json`, geschrieben von dieser Phase

`docs/capture-session.schema.json` (neu, gehoert 01) ist die Autoritaet. Die Datei liegt im
Buendel neben `log.jsonl`, also unter `files/sessions/<id>/`:

```json
{"id": "wq-light-sehr-hell", "height": "normal", "light": null,
 "steps": [{"ply": 0, "orientation_deg": 0,
            "place": [{"square": "h3", "piece": "wQ"}]}]}
```

`place` hat **dieselbe Form wie im Plan-Schema**. Die Ausrichtung ist **deklariert**, nicht
gemessen — die App hat zum Drehen aufgefordert, mehr kann sie behaupten.

### `SessionMeta`

Alle sechs Felder wie bei einer normalen Aufnahme; **`profile = "default"`**, nicht `desktop`
(nachgemessen: das Handy-Buendel von `2026-09-06-21-29-35` sagt `default`, die daneben liegende
EXPORTIERTE `session.yaml` sagt `desktop` — wer die falsche liest, behauptet eine Desktop-Herkunft).
`notes` = die `id` des Auftrags.

### Typen und Bildschirme

```kotlin
@Serializable data class Placement(val square: String, val piece: String)
@Serializable data class Gap(
    val piece: String, @SerialName("square_color") val squareColor: String, val band: String,
    val have: Int, val fix: String, @SerialName("corpus_in_band") val corpusInBand: Int)
@Serializable data class Shot(
    val id: String, val fix: String, val reason: String, val place: List<Placement>,
    val light: String?, @SerialName("reference_square") val referenceSquare: String,
    val height: String, val orientations: Int, val closes: List<Gap>)
@Serializable data class CapturePlan(
    @SerialName("generated_at") val generatedAt: String, val dataset: String,
    @SerialName("gaps_from") val gapsFrom: String, val shots: List<Shot>)
```

`Json { ignoreUnknownKeys = true }`, sonst wirft jeder Schluessel, den 00 spaeter ergaenzt.

| Bildschirm | Inhalt |
|---|---|
| Plan | Auftragsliste mit `reason` und `fix`, „Auftrag 3 von 10", Abdeckung als Text **mit `generated_at`** |
| Aufbau | der Auftrag im Klartext, Kamerabild, Knopf „Aufbau steht" |
| Drehen | „Schritt 4 von 8 — 135 Grad", Knopf „Aufgenommen"; **jeder Schritt wird von Hand quittiert**, kein Timer |

**Fortschritt, nicht Abdeckung.** Die Zahl „3 von 10" kommt aus dem Plan. Die Abdeckung stammt aus
einem gebauten Datensatz und bewegt sich nach einem Upload nicht — deshalb steht ihr
Erzeugungszeitpunkt daneben.

## Steps

1. `fenOf(Map)` oeffnen, `fenOf(snap)` ruft es → `feat(engine): den Brett-FEN aus einer Feldkarte`
2. Plan-Abruf und Typen → `feat(capture): Auftraege aus der Plan-Route`
3. Drei Bildschirme → `feat(capture): Plan, Aufbau, Drehen`
4. Aufnahme je Ply mit FEN, `capture.json` → `feat(capture): Aufbau als FEN je Drehschritt`
5. Abdeckung mit Zeitstempel → `feat(capture): Abdeckung mit ihrem Erzeugungszeitpunkt`

## Tests

`gradlew.bat :core-engine:test :app:test --rerun-tasks`:

- `fenOf(mapOf("h3" to "wQ"))` gibt `"8/8/8/8/8/7Q/8/8 w - - 0 1"`; die leere Karte gibt
  `"8/8/8/8/8/8/8/8 w - - 0 1"`.
- Fuer einen bestehenden `CnnSnapshot`-Fall liefert `fenOf(snap)` **denselben String wie vor der
  Aenderung** — der Wert gehoert in den Test, nicht in eine Behauptung.
- Ein Auftrag mit `orientations = 8` erzeugt acht `steps`, Ply 0 traegt `orientation_deg = 0`,
  Ply 3 traegt 135.
- Leeres `place` (`fix = "Licht"`) erzeugt trotzdem acht Schritte, alle mit dem Leerbrett-FEN.
- Ein Plan-JSON mit unbekanntem Zusatzschluessel wird gelesen statt geworfen.
- Ein 401 der Plan-Route ergibt eine sichtbare Kopplungs-Meldung, nicht eine leere Liste.
- **Integrationstest gegen den ECHTEN `SessionRecorder`**: nach acht Schritten liegen `log.jsonl`
  mit acht Zeilen samt aufsteigendem `ply`, `session.yaml` mit `profile: default` und
  `capture.json` mit acht `steps`.

Dazu einmal `gradlew.bat :app:test --tests "*CommentBudgetTest*" --rerun-tasks`.

## Acceptance

- `gradlew.bat :app:assembleDebug :app:test :app:ktlintCheck :app:detekt --rerun-tasks` gruen.
- `grep -rn "bindToLifecycle" android/app/src/main/ | wc -l` gibt **1** (heute 1 — die Zahl darf
  sich durch diese Phase nicht aendern).
- `grep -rln "w - - 0 1" android/*/src/main/ --include=*.kt` nennt nur `ReadingFen.kt`.
- `grep -rn "class SessionRecorder\|class HttpIngestClient\|class ArucoCalibrator" android/app/src/main/kotlin/com/chesslab/tracker/capture/`
  trifft nichts.
- Eine mit dem Modus aufgenommene Session laeuft durch `chesslab realgames export-session` und
  hinterlaesst `boards/`.

## Do NOT

- Kein neues Modul, kein zweites APK, keine zweite Kamerabindung, kein eigener Session-Schreiber,
  kein eigener Upload, kein eigener FEN-Bauer.
- `TrackerCamera`, `CameraVideo`, `ArucoCalibrator` nicht umbauen — nur benutzen.
- Ueber Frame-Namen nichts verbinden; der Ply ist der Schluessel.
- Keinen Abdeckungszaehler auf dem Geraet fuehren.
