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

### 4K — erst messen, dann entscheiden (offen, 2026-09-13)

**Warum die Frage hier steht.** Ein Turntable dreht das Brett DIAGONAL durchs Bild. Gemessen an 14
Aufnahmen: Brettkante ~950 px, Diagonale beim 45-Grad-Dreh 1343 px, kurze Bildseite 1440 px —
**Reserve 1,06x im Median, 1,02x im schlechtesten Fall.** Rechnerisch passt es, praktisch nicht:
die `corners` sind das INNERE Brettquad, der Rahmen kommt dazu, und hohe Figuren neigen sich
perspektivisch nach aussen. Der Mensch muss also zurueck.

Was das kostet, ist klein: mit 15 % Rand um die Diagonale sinkt die Zelle von 119 auf **111
Quellpixel** — 7 %, und damit im gemessenen Korpusband von 97–126 (`docs/evaluation.md`).
Bei 3840x2160 waeren es bei gleicher Rahmung **~166 Quellpixel**, also +40 % gegenueber heute.
128 px waeren dann erstmals eine VERKLEINERUNG statt eines Gleichstands — und die Schranke
„128 px ist die Sensorgrenze" (`evaluation.md`) gaelte nicht mehr.

**Korrigiert 2026-09-13: es braucht wahrscheinlich gar keinen Umbau.** Ich hatte hier eine zweite
Bindung (`VideoCapture` statt `ImageAnalysis`) vorgeschlagen. Nachgesehen:

- `ResolutionMode.R2160` → `CameraRequest(WIDTH_2160, HEIGHT_2160)` existiert schon
  (`CameraModels.kt:66`) und steht im Einstellungsmenue (`AppSettingsSection.kt:39` listet
  `ResolutionMode.entries`).
- `CameraVideo.sourceAvailable` ist ein **Boden**, keine Obergrenze: `max ≥ 2560 && min ≥ 1440`
  (`CameraVideo.kt:161-164`). 3840×2160 kommt durch.
- `androidx.camera:camera-video` ist gar nicht im Projekt (`libs.versions.toml:59-60` fuehrt nur
  `camera-core` und `camera-camera2`) — `VideoCapture` und `QualitySelector` sind nicht auf dem
  Klassenpfad. Der Umbau waere also TEURER als der Weg, der schon da ist.

Wer heute 2160p einstellt, bekommt 4K durch den bestehenden MediaCodec-Weg. **Ungeprueft bleibt,
ob das Geraet 3840×2160 an `ImageAnalysis` liefert** — das entscheidet eine Aufnahme, kein Code.

**Der Haken ist die Bitrate, nicht die Bindung.** `VIDEO_BIT_RATE` steht fest auf 20 Mbit/s.
2160p hat **2,25× die Pixel** von 1440p; bei gleicher Bitrate sinkt die Qualitaet je Pixel im
selben Mass, in dem die Aufloesung steigt. Der erhoffte Gewinn von +40 % Quellpixel je Zelle
koennte davon aufgefressen werden. **15 fps rettet das fast genau**: halbe Bildrate bei gleicher
Bitrate verdoppelt die Bits je Bild und deckt damit 89 % des 4K-Aufschlags. Die beiden
Entscheidungen des Nutzers greifen also ineinander — einzeln ist keine von beiden sicher.

**15 fps ist die Absicht des Nutzers** (2026-09-13, Platzgruende). Zwei Dinge dazu gehoeren in die
Messung: `VIDEO_BIT_RATE` ist heute fest auf 20 Mbit/s, und bei halber Bildrate bleibt die Datei
damit **gleich gross** — die Ersparnis kaeme von der Bitrate, nicht von der Bildrate. Und 15 fps
erlaubt bis zu 1/15 s Belichtung; bei 6 Grad/s Drehung sind das rund 3 px Verschmierung an der
Brettkante, bei 18 Grad/s schon 10. Also: langsam drehen, und die Schaerfe hinterher je Frame
messen, statt sie zu hoffen.

### Das Aufnahmeprofil der Erfassung (entschieden 2026-09-13, Nutzerwunsch)

Der Erfassungsmodus nimmt mit **eigenen** Werten auf, nicht mit denen des Partiewegs:

| | Partie | Erfassung |
|---|---|---|
| Aufloesung | `ResolutionMode` des Nutzers (heute `R1440`) | **`R2160`** (3840×2160) |
| Bildrate | `FPS15` (schon heute) | **15** |
| Bitrate | 20 → **30 Mbit/s** | **67 Mbit/s** |

**Korrigiert 2026-09-13.** Eine fruehere Fassung rechnete den Partieweg mit 30 fps und kam auf
0,181 bit/px. Gemessen laeuft er mit **15** (`settings.json`: `"frameRate":"FPS15"` in allen acht
juengsten Aufnahmen), also **0,362 bit/px**. Die daraus abgeleiteten 40 Mbit/s fuer 4K waeren mit
0,322 bit/px ein RUECKSCHRITT gewesen, kein Gewinn.

| Profil | Mpx/s | bit/px | MB/min |
|---|---:|---:|---:|
| Partie heute (1440/15, 20) | 55,3 | 0,362 | 150 |
| Partie **gemessen** (Median 17,7) | 55,3 | 0,320 | 133 |
| Partie neu (1440/15, **30**) | 55,3 | 0,543 | 225 |
| Erfassung 4K/15 bei **67** | 124,4 | 0,539 | 502 |

Beide neuen Profile liegen bei ~0,54 bit/px, also dem **1,5-Fachen** von heute. Eine Turntable-
Runde ist kurz (acht Ausrichtungen zu 30 s = 4 min = 2 GB), eine 13-Minuten-Partie kostet 2,9 GB
statt 1,95 GB.

**Der Partieweg DARF sich hier aendern** — anders als bei den Trainingsschaltern. Der Korpus ist
schon heute nicht einheitlich: die gemessenen Bitraten der vorhandenen Aufnahmen reichen von
**8,1 bis 19,6 Mbit/s** (Faktor 2,4), und niemand hat es bemerkt, weil nichts sie aufschreibt.
Eine Anhebung verschiebt neues Material ans bessere Ende. **Die tatsaechliche Bitrate gehoert
deshalb in `session.yaml`**, je Aufnahme, sonst wiederholt sich genau dieses Uebersehen.

**Nebenbefund, der eine Entscheidung beruehrt:** die eingefrorene Testaufnahme
`rg-2026-09-11-20-00-52` liegt mit **8,1 Mbit/s** am unteren Ende — sie ist staerker komprimiert
als das Material, auf dem trainiert wurde. Das gehoert gemessen, BEVOR sie verbraucht wird.

**`session.yaml` untertreibt die Groesse um den Faktor 10:** dort steht `video_bytes: 76,7 MB`,
auf der Platte liegen 761 MB in 13 Segmenten. Der Zaehler erfasst offenbar nur ein Segment. Fuer
die Pipeline harmlos, aber jede Platzrechnung daraus ist falsch.

### Die Bitrate folgt der Aufloesung, statt zweimal dazustehen (2026-09-13)

Zwei fest verdrahtete Zahlen sind eine Einladung, sie auseinanderlaufen zu lassen. Es ist EINE
Entscheidung — wie viele Bits ein Pixel wert ist — und die gilt fuer beide Wege:

```
bitRate = round(width * height * fps * BITS_PER_PIXEL)
BITS_PER_PIXEL = 0.54
```

| Modus | Mbit/s | MB/min |
|---|---:|---:|
| R1080 @ 15 | 16,8 | 126 |
| **R1440 @ 15** (Partie) | **29,9** | 224 |
| **R2160 @ 15** (Erfassung) | **67,2** | 504 |
| R1440 @ 30 | 59,7 | 448 |
| R2160 @ 30 | 134,4 | 1008 |

Die beiden beschlossenen Werte fallen mit **unter 0,5 % Abweichung** aus der Formel (29,9 gegen 30,
67,2 gegen 67). `DEFAULT_VIDEO_BIT_RATE` entfaellt damit als Konstante; `BITS_PER_PIXEL` ist die
einzige Stellschraube, und 0,54 ist das 1,5-Fache der heute gemessenen 0,362.

**Zwei Folgen, die ausgesprochen gehoeren.** Die Bildrate ist damit nicht mehr gratis: wer auf 30
stellt, verdoppelt die Datei. Das ist richtig so — gleiche Qualitaet je Bild kostet bei doppelt so
vielen Bildern das Doppelte —, aber es ueberrascht, wenn es nirgends steht. Und R2160 bei 30 fps
laege bei 134 Mbit/s und 1 GB/min; ob der Encoder das annimmt, entscheidet die schon gebaute
Klemmung, und sie ist laut.

**Der Boden bleibt.** Ein unglaubwuerdig kleiner Wert (etwa aus einer winzigen gelieferten Groesse)
darf nicht durchgereicht werden: unter 8 Mbit/s wird auf 8 geklemmt und das steht in den `notes`.
8, weil die schwaechste vorhandene Aufnahme (`rg-2026-09-11-20-00-52`) genau dort liegt und schon
sie als grenzwertig gilt.

**10 fps ist auf diesem Geraet vermutlich nicht zu haben.** `pinFrameRate` waehlt nur aus
ADVERTISED `CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES`, und der Kommentar dort haelt fest, dass die
Rueckkamera des 24117RK2CG **keine gesperrte Spanne unter 15** anbietet
(`TrackerCamera.kt:311-313`). Fehlt die Spanne, laesst der Code AE in Ruhe und warnt laut — dann
laeuft die Kamera schneller als eingestellt. Also: 15 als Vorgabe, 10 nur wenn das Geraet es
anbietet, und die Wahl gehoert in die Aufnahme-Metadaten, damit hinterher nachlesbar ist, was
wirklich lief.

**Bewegungsunschaerfe ist KEIN Argument gegen 15 fps** — gemessen: bei `[15,15]` waeren 66,7 ms
erlaubt, das Geraet fuhr **10,0 ms** (`docs/camera.md`). Die Belichtung ist nicht
verhandelbar, also kostet eine langsamere Bildrate keine Schaerfe.

**GEBAUT 2026-09-13.** `agreedProfile` fragt vor dem `configure` die
`MediaCodecInfo.CodecCapabilities` (Groesse, Bildrate, Bitratenbereich) und klemmt laut: Logcat,
roter Text auf beiden Schirmen, `notes` in `capture.json`. Ob das Geraet 2160p an `ImageAnalysis`
liefert, bleibt ungeprueft — es gibt kein Geraet; die Antwort steht danach in
`recording.delivered_size`.

**Erledigt.** Die urspruengliche Fassung verlangte hier eine Geraetemessung VOR jeder Umstellung.
Sie ist entfallen, weil die Messung ohne Geraet nicht zu haben war und der Nutzer die Umstellung
beschlossen hat. Was an ihre Stelle trat, ist besser: nichts faellt still zurueck, und was das
Geraet wirklich getan hat, steht nach jeder Aufnahme in `recording` (`delivered_size`,
`ae_fps_range`, `bit_rate`, `notes`). Offen bleiben zwei Dinge, die nur eine echte Aufnahme
beantwortet: ob 2160p geliefert wird, und ob das Geraet unter 15 fps eine gesperrte AE-Spanne
anbietet.

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
