# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | done | 2026-09-12; Planer, Schema, CLI, zwei Routen. 46 Auftraege auf der VOLLEN Karte, 46 eindeutige `id`. 18 pytest, 4 vitest gruen |
| 01 | 01-import.md | **achtung** | 2026-09-13; gebaut, liest aber noch `steps[].video_frame`. Das Schema fuehrt seit derselben Nacht `elapsed_ns` — der Import bricht auf jedem Buendel ab, das 02 schreibt. Siehe unten |
| 02 | 02-erfassungs-modus.md | done | 2026-09-13; alle vier Steps. `elapsed_ns` statt Frame-Index (Blocker unten, geloest). 8 JVM-Tests gruen, ktlint gruen, `:tracker-runtime` und `CameraVideo` unberuehrt. **4K ist NICHT gemessen** — kein Geraet, siehe eigener Abschnitt |
| 03 | 03-messachsen.md | done | 2026-09-12; `pose_of`, `axes` ueber 979 363 Zeilen. Gemessen: `foreshorten` 0,95-1,00 = 502 278, 1,00-1,05 = 100 445, unbekannt = 376 640; `edge_px` 900-1000 = 406 077. `height`/`orientation_deg` heute ganz unbekannt — es gibt keine `capture.json` |

## Dependencies

00 und 01 teilen keine Datei und laufen parallel. 02 braucht 00. 01 und 03 lesen `capture.json`,
deren Schreiber 02 ist — beide testen gegen eine von Hand geschriebene Datei.

**Vorbedingung erfuellt (2026-09-12):** backfill gelaufen (376 640 Zeilen), Karte und Plan neu.
Sie war kein Formalismus — 12 der 58 Luecken waren laengst gedeckt.

## Manual steps

Die Aufnahmen macht der Nutzer: Stellung aufbauen, Licht stellen, Figur drehen, Hoehe aendern.
Kein Agent nimmt etwas auf.

## Notes / discrepancies

**Sechs Pruefungen durch fremde Agenten.** Fassung 7 beantwortet den letzten strukturellen Befund.

**Der Weg war zweimal nur zur Haelfte geprueft — beide Male von mir.** Erst habe ich belegt, dass
ein gezielter Aufbau als FEN LABELBAR ist, und daraus geschlossen, der bestehende Weg trage ihn.
Dann habe ich belegt, dass `export-session` ein VIDEO braucht, und daraus geschlossen, Video sei
die einzige Huerde. Tatsaechlich verlangt derselbe Weg eine bestaetigte Zugfolge gegen eine
Referenzpartie (`realgames.py:1559`, `:1611`), und eine Erfassung hat keine Partie. Phase 01 ist
die Antwort: ein eigener Einstieg, der `rewarp_boards` (`realgames.py:1066`) und
`Recording.frames` (`recording.py:38`) benutzt und die Kandidaten-Maschinerie auslaesst.

**Video bleibt** — nicht aus Pipeline-Gruenden, sondern weil beim Drehen ein durchgehender Schwenk
entsteht statt acht Standbildern. Die Zwischenwinkel sind der Zweck der Uebung.

**Was die sechste Pruefung fand und was davon stimmte:**

| Befund | Antwort |
|---|---|
| `export-session` braucht einen bestaetigten Kandidaten, nicht nur ein Video | **Stimmt, verifiziert.** Neue Phase 01 |
| „kein Weg, ohne Partie aufzunehmen" | **Nur halb.** Der bestehende AUFRUFPFAD haengt an `GameSessionController.kt:223`, die Bausteine sind oeffentlich: `SessionRecorder(dir, meta)` (`:83`), `capture(…, moveSan: String?, …)` (`:105-113`), `RecordingBundleHost.armVideo/opened/finished`. `:tracker-runtime` bleibt unberuehrt |
| `ply` steht nicht in jeder Manifestzeile | **Stimmt:** 602 723 ja, 376 640 nein (alle Kompositen). 03 zaehlt sie unter `"unbekannt"` |
| Ein `ply` steht fuer viele Frames (Median 16) | Aufgenommen: der Verbund ist 1:n |
| `foreshorten` zitierte das falsche `log.jsonl` | Jetzt das OBERE, verbunden ueber `(session_id, frame)` |
| `SessionMeta.profile` ist der Kalibrierprofil-Name | `profile()?.name ?: DEFAULT_PROFILE`, wie im Partieweg |
| `ChesslabNavHost` ist die eine Topologie | Im Register, drei Ziele dort registrieren |
| `edge_px` hatte keinen Abnehmer | Eigene Achse in `axes` |
| `fenOf`-Parametername `empty` kollidiert | Heisst `blank` |
| `cli.py:407` / „40 Tests" | `:406`, 50 |

**Und ein Befund, der aus dem Gespraech kam, nicht aus der Pruefung:** die Kompositen sind ECHTES
Material — 2.5D-Montage echter Bretter mit echten Handplatten, auf demselben Rig gedreht
(`composite.py:1-4`, `RIG_SCALE`). Ihnen fehlt nur die Spalte `brightness`, obwohl sie berechenbar
ist (Grauwert-Mittel des Crops, `labeling.py:565`). Solange sie fehlt, rechnet die Luecken-Karte
auf 62 % des Korpus, und manche der 58 Luecken koennten laengst gedeckt sein.
`scripts/backfill_brightness.py` traegt sie nach; das ist Vorbedingung fuer den ganzen Pack.

**Zahlen, mehrfach nachgerechnet:** 58 duenne Zellen, 34 Stellung, 24 Licht, 27 bei null —
**auf der halben Karte**, also vorlaeufig. `brightness` fehlt in 376 640 von 979 363 Zeilen.
Verkuerzung 0,955–1,025, Median 0,986 ueber 24 Aufnahmen mit `corners`; der Datensatz traegt 23.
`--rot90 +0,0245` ueber sieben gepaarte Seeds, p = 0,0078.

**Nach der Umsetzung von 00 und 03 (2026-09-12):**

| | |
|---|---|
| `BANDS` verschoben | aus `scripts/coverage_gaps.py` nach `src/chesslab/capture_plan.py` — `scripts/` ist kein Paket, und zwei Auswahlregeln haengen daran |
| Akzeptanz 00 sagte `Verkuerzung` | `docs/capture-axes.md` schreibt `Verkürzung`; die Spec-Zeile wurde auf den Umlaut gezogen, das Dokument nicht verstuemmelt |
| `CaptureSession`/`CaptureStep` | in `capture_plan.py` angelegt, obwohl `docs/capture-session.schema.json` (02) noch fehlt — 03 spiegelt nur, 02 bleibt Autoritaet |
| Kommentarbudget | zweimal zugeschlagen: Modul-Docstring 7 Zeilen, `lib/capture-plan.ts` 6. Beide gekuerzt, nicht ausgenommen |
| Achsen-Tests | `coverage_gaps.py` ueber `importlib.util.spec_from_file_location` geladen, wie `tests/test_episode_eval.py` |

**Die Vorbedingung ist erfuellt — und sie hat sich gelohnt.** Backfill ueber alle 376 640
Komposit-Zeilen, danach Karte und Plan neu:

| | halbe Karte | volle Karte |
|---|---|---|
| duenne Zellen | 58 | **46** |
| bei null Belegen | 27 | **16** |
| nur ueber Licht | 24 | **12** |

**12 Luecken waren laengst gedeckt** (`bR`/hell/`hell` trug 194, `wR`/dunkel/`sehr dunkel` 179),
und die gewaehlten Felder verschoben sich (`h3` → `g4`), weil die Kompositen jeden Feldmedian
mitbestimmen. Keine Luecke kam neu hinzu.

**Ein Rest bleibt offen:** der Backfill lief auf die Seitendatei
`data/datasets/real13-mix-v7-128/manifest-bright.jsonl`, weil der Ablationslauf denselben
Datensatz liest. Wenn er durch ist, ueber `manifest.jsonl` schieben — sonst rechnet der naechste
Aufruf ohne `--manifest` wieder auf der halben Karte.

**Offen:** Fassung 7 ist noch nicht geprueft. Budget 674 Zeilen gegen einen Richtwert von 500 —
vier Phasen statt drei, jede unter 150.

**Nachgezogen 2026-09-13, vor der Umsetzung von 01/02.** Phase 01 leitete den Video-Frame-Index
aus der Reihenfolge her („die n-te Zeile ist der n-te angeforderte Frame") — das ist zirkulaer:
um Frames anzufordern, muesste man ihre Indizes schon kennen, und das Buendel-Log traegt nur
`frames/0000.jpg` und eine Wanduhrzeit. Der Recorder KENNT die Zahl (sie steht fuer einen Zug in
`candidate.json` unter `moves[].frame`), sie wurde nur nie ins Buendel geschrieben.

Behoben: `docs/capture-session.schema.json` liegt jetzt und fuehrt `steps[].video_frame` als
Pflichtfeld. 02 schreibt es, 01 liest es und bricht ohne es ab. Das Schema ist damit die
Autoritaet, gegen die beide Phasen parallel bauen koennen.

## Blocker 02 (2026-09-13, GELOEST): `video_frame` hatte auf dem Geraet keine Quelle

`docs/capture-session.schema.json` und `02-erfassungs-modus.md` sagen beide, der Recorder kenne die
Zahl im Moment der Aufnahme, „dieselbe Zahl, die `candidate.json` unter `moves[].frame` fuehrt".
**Der Code sagt etwas anderes.** `moves[].frame` entsteht auf dem PC:
`RealGameCandidate.kt:31` nennt es „0-based decode index of the frame", und
`PhoneCandidate.kt:550` holt es aus `PhoneFrameClock.indexAt(videoMs)` — einer Liste von
Frame-Zeitstempeln, die der Scan beim **Dekodieren des Videos** gesammelt hat. Die Bruecke davor
sind die `video_sync`-Zeilen der `timeline.jsonl` (`RecordedFrames.videoNsAt`).

Auf dem Telefon existiert kein Frame-Index. Gesucht in `SessionRecorder`, `RecordingBundleHost`,
`SessionCaptureController`, `SessionTimeline`, `CameraVideo`: `grep -rn "videoFrame|frameIndex|
frameCount|frameNumber" app/src core-engine/src tracker-runtime/src` findet genau einen Treffer,
und der ist ein Testfixture. Was die App ehrlich weiss, ist die **Videozeit**
(`VideoProgress.durationNs`, je gemuxtem Sample gemeldet) — und genau die schliesst das Schema als
Ersatz aus („`t` … nie als Ersatz fuer `video_frame`").

**Entschieden wurde Weg 2** (Nutzer, 2026-09-13): `docs/capture-session.schema.json` fuehrt jetzt
`elapsed_ns` statt `video_frame`, der Import rechnet ueber die `video_sync`-Zeilen zur Videozeit
und daraus zum Index — derselbe Weg wie der Partie-Import. `CameraVideo` ist unberuehrt geblieben.
Die beiden Wege, die zur Wahl standen:

1. **`CameraVideo` zaehlt seine gemuxten Samples** und gibt den Index heraus (Vorlauf-Flush in
   `goLive` + Live-Samples in `sample`). Das ist gemessen, nicht geschaetzt, und liegt in `:app`,
   nicht in `:tracker-runtime`. Es verletzt aber das „Do NOT" der Phasendatei
   („`CameraVideo` … nicht umbauen — nur benutzen").
2. **Das Schema laesst `video_frame` aus der Videozeit ableiten** (Import rechnet `t` gegen die
   Frame-Zeitstempel, wie der PC es fuer eine Partie ohnehin tut). Dann aendert sich
   `docs/capture-session.schema.json`, und 01 muss mitziehen.

Bis dahin bleiben Step 3 (die drei Bildschirme) und Step 4 (Aufnahme je Ply) liegen: Step 4
braucht die Zahl direkt, Step 3 braucht fuer den Aufbau-Schirm dieselbe laufende Kamera, die Step 4
verdrahtet.

**Nebenbefund, kein Blocker:** die Plan-Route antwortet `{"shots": [], "why": <Befehl>}`, wenn kein
Plan gerechnet wurde (`platform/app/lib/capture-plan.ts:62`). `why` steht in
`docs/capture-plan.schema.json` nicht. Der Kotlin-Typ traegt es trotzdem, sonst laese die App
„kein Plan gerechnet" als „alles abgedeckt".

**Umgebung, waehrend 02 lief:** ein zweiter Agent hat gleichzeitig in `:core-engine` und
`:tracker-runtime` geschrieben (`recordSight`/`sightSettled`, „early commit on sight"). Der Baum
war zeitweise nicht uebersetzbar und ein `processTestResources` lief einmal in eine Race auf
`core-engine/build/`. Beide Gates sind spaeter sauber durchgelaufen; die Zahlen unten stammen von
diesen Laeufen.

**Blocker 02 aufgeloest, 2026-09-13 (Nutzerentscheid: „nimm das, was wir eh schon machen").**
Die Pruefung des Android-Agenten war richtig: einen Video-Frame-INDEX kennt das Geraet nicht, er
entsteht beim Dekodieren auf dem PC (`PhoneCandidate.kt:550`). Meine Spec-Reparatur vom Vortag
behauptete das Gegenteil und war falsch.

Umgestellt auf das, was der Partie-Import ohnehin tut: `capture.json` traegt
`steps[].elapsed_ns` — die monotone Geraeteuhr, die `SessionTimeline` schon in jede Zeile
schreibt — und der Import interpoliert ueber die `video_sync`-Zeilen der `timeline.jsonl` zur
Videozeit und daraus zum Index. Auf `2026-09-11-20-00-52` liegen 10 543 solche Zeilen.

Zwei Dinge machen das billiger als beim Partie-Pfad: ein Drehschritt ist **statisch**, also kostet
ein Frame Ungenauigkeit nichts und der Import nimmt gleich das ganze Fenster
`[elapsed_ns, elapsed_ns_end)`. Und `CameraVideo` bleibt unberuehrt, das „Do NOT" der Phase haelt.

**Offen dabei:** Python hat keinen Timeline-Leser, die Umrechnung liegt in Kotlin
(`RecordedFrames.videoNsAt`). Phase 01 bekommt eine kleine eigene — mit **Paritaetstest gegen
gemessene Kotlin-Werte**, nicht gegen sich selbst (`kotlin-is-the-reference-implementation`).

## Was 02 beim Umsetzen von Step 3/4 gegen den Code gefunden hat (2026-09-13)

| Befund | wie geloest |
|---|---|
| Die Plan-Route antwortet `{"shots": [], "why": <Befehl>}`, wenn kein Plan gerechnet wurde (`lib/capture-plan.ts:62`). `why` steht in `docs/capture-plan.schema.json` NICHT | Der Kotlin-Typ traegt es trotzdem. Ohne das laese die App „kein Plan gerechnet" als „alles abgedeckt" — genau die Verwechslung, gegen die die Route den Schluessel schreibt. **Schema nicht angefasst** |
| Fuer `/api/capture/coverage` gibt es gar kein Schema; die Route reicht `data/reports/coverage-gaps.json` plus `generated_at` aus der mtime durch | `CaptureCoverage` ist an der ECHTEN Datei abgelesen (`dataset`, `thin_below`, `gaps[]`) und liest mit `ignoreUnknownKeys` alles andere weg. Der Schirm zeigt `gaps.size` und das Datum — gezaehlt hat der PC, nicht das Telefon (Do-NOT: kein Abdeckungszaehler auf dem Geraet) |
| `GameSessionWiring.DEFAULT_PROFILE` ist **private** und liegt in `:tracker-runtime` | Die Konstante steht als `CAPTURE_DEFAULT_PROFILE` ein zweites Mal in `TrackerService.kt`, mit Zeiger auf das Original. `:tracker-runtime` bleibt unberuehrt, wie die Phasendatei verlangt |
| `CalibrationStore.profile` ist ein kalter `Flow`, kein `StateFlow`; `wireGameSession` haelt seine Kopie modul-intern | `TrackerService` sammelt den Profilnamen ein zweites Mal ein. Ein Collector, keine zweite Quelle |
| `Shot` hat neun Pflichtschluessel, detekts `LongParameterList` steht auf 8 | `@Suppress("LongParameterList")` mit Begruendung, wie `TrackerCoordinator.kt:50` und `TrackerStack.kt:58` es vormachen. Die Liste IST das Schema |
| `TrackerBinder` ist bewusst „flows in, values out" und gibt Kamera und Recorder nicht heraus | Der Modus bekommt einen eigenen `CaptureRecorderHost`, den der Service veroeffentlicht — dasselbe Muster wie `GameSessionHost`. Keine zweite Kamerabindung, `bindToLifecycle` steht weiter auf 1 |

**Was `elapsed_ns` in dieser Umsetzung genau bedeutet.** `elapsed_ns` ist die Uhr, als die App zum
Schritt AUFFORDERTE (bei Ply 0: als „Aufbau steht" gedrueckt wurde), `elapsed_ns_end` die Uhr beim
Griff nach dem Bild. Die Schritte kacheln die Zeitleiste damit lueckenlos — genau die Regel, die
das Schema selbst als Ruecklauf nennt („fehlt es, gilt der Beginn des naechsten Schritts").
**Das Fenster enthaelt also die Drehbewegung**, nicht nur den Stillstand danach. Das ist
beabsichtigt: die Zwischenwinkel sind der Zweck der Uebung, und eine Hand ueber einem
unveraenderten Brett behaelt ihr FEN (CLAUDE.md, „The board is the witness, not the hand"). Wer
spaeter nur den Stillstand will, nimmt das Ende des Fensters.

**Ein verlorenes Bild schreibt keinen Schritt.** `source.grab()` gibt `null` zurueck, solange keine
`corners` anliegen (`LiveCaptureSource.kt:34`) — ohne laufenden Tracker also immer. Dann bleibt der
Zaehler stehen und der Schirm sagt es, statt einen Schritt zu ueberspringen: `steps` und
`log.jsonl` haben immer dieselbe Laenge.

## 4K — was statisch feststeht und was ohne Geraet nicht geht (2026-09-13)

**Die Messung, die die Phasendatei verlangt, konnte ich NICHT machen: es haengt kein Geraet dran**
(`adb devices` listet nichts), der Emulator ist gesperrt und wuerde die Frage fuer DIESES Telefon
ohnehin nicht beantworten. Was ohne Geraet feststeht, steht hier; darunter die Befehle.

**Befund 1 — `androidx.camera:camera-video` ist gar nicht im Projekt.** `gradle/libs.versions.toml`
fuehrt `camera-core`, `camera-camera2`, `camera-lifecycle`, `camera-view`, sonst nichts
(`app/build.gradle.kts:190-193`). `Recorder`, `Recorder.getVideoCapabilities`, `QualitySelector`
und CameraX' `VideoCapture` sind also **nicht auf dem Klassenpfad**. Die Messung braucht zuerst
eine neue Abhaengigkeit — das ist mehr als „messen, nicht bauen", deshalb habe ich sie nicht
hinzugefuegt.

**Befund 2 — fuer 4K braucht es `VideoCapture` womoeglich gar nicht.** `CameraVideo` kodiert den
Analyzer-Strom, und der Analyzer kennt 2160p schon: `ResolutionMode.R2160` = 3840x2160
(`CameraModels.kt:66,77-78`) steht als Einstellung „Camera & model" im Menue. Und die Schranke, die
das Video ablehnt, ist ein **Boden**, keine Decke: `sourceAvailable` verlangt
`max >= 2560 && min >= 1440` (`CameraVideo.kt:161-164`), was 3840x2160 erfuellt. Heisst: wer heute
2160p einstellt und aufnimmt, bekommt ein 4K-Video durch den bestehenden MediaCodec-Weg — ohne
zweite Kamerabindung, ohne neue Abhaengigkeit, ohne Umbau. Der Abschnitt „4K" der Phasendatei
nimmt an, dafuer muesse `VideoCapture` STATT `ImageAnalysis` gebunden werden; der Code sagt, das
ist nicht noetig. **Ungeprueft bleibt, ob das Geraet 3840x2160 auch LIEFERT** — `deliveredSize`
wird am `ImageProxy` gelesen, nie an der Anfrage, und `ResolutionMismatchLogger` existiert genau
dafuer.

**Befund 3 — die Bitrate ist der eigentliche Haken, und sie ist fest.** `VIDEO_BIT_RATE` steht hart
auf 20 Mbit/s (`CameraVideo.kt:19`), `KEY_FRAME_RATE` folgt der Einstellung, `KEY_BIT_RATE` nicht.
Daraus zwei Dinge, beide reine Code-Lektuere:

- Bei 15 statt 30 fps bleibt die Datei **gleich gross** (~150 MB/min, 1-GB-Kappe ≈ 6,7 min). Die
  Ersparnis kaeme von der Bitrate. Das bestaetigt, was die Phasendatei vermutet.
- 2160p hat **2,25x** die Pixel von 1440p, bekommt aber dieselben 20 Mbit/s. Der Gewinn, um den es
  geht, sind +40 % Quellpixel je Zelle — ein Kompressionsverlust in derselben Groessenordnung
  frisst ihn auf. **Ohne Bitratenanhebung ist 4K kein sicherer Gewinn**, und mit ihr steigt der
  Platzbedarf linear. Das gehoert in die Entscheidung, nicht erst hinterher in die Messung.

**Was der Nutzer selbst laufen lassen muss.** Zwei Stufen, die billige zuerst:

1. *Beantwortet die eigentliche Frage, ohne Codeaenderung.* Telefon anstecken, in der App
   Einstellungen → „Camera & model" auf **2160p**, Recording an, eine Drehung aufnehmen. Danach:

   ```
   adb logcat -d -s chesslabVideo
   adb exec-out "run-as com.chesslab.tracker cat files/sessions/<id>/session.yaml"
   ```

   `video_size` sagt, was wirklich kodiert wurde, `video_bytes`/`video_duration_ns` die reale
   Datenrate, und eine `video_error`-Zeile sagt, wenn der Encoder 4K abgelehnt hat. Thermisches
   Drosseln zeigt sich als einbrechende Bildrate ueber die Laenge einer Drehung.
   **Vorher `files/` sichern** (CLAUDE.md, „Phone: back up `files/` before touching the install").

2. *Beantwortet die woertliche Frage der Phasendatei.* Dafuer muss `camera-video` dazu:

   ```kotlin
   // gradle/libs.versions.toml
   camera-video = { group = "androidx.camera", name = "camera-video", version.ref = "camera" }
   ```

   ```kotlin
   val caps = Recorder.getVideoCapabilities(cameraProvider.availableCameraInfos.first())
   Log.i("chesslab4k", "qualities=" + caps.getSupportedQualities(DynamicRange.SDR))
   Log.i("chesslab4k", "uhd=" + caps.isQualitySupported(Quality.UHD, DynamicRange.SDR))
   ```

   plus ein `bindToLifecycle(owner, selector, VideoCapture.withOutput(recorder))` OHNE
   `ImageAnalysis`, um „bindet `VideoCapture` allein?" zu beantworten. **Das ist ein Umbau und
   haette die `bindToLifecycle`-Zahl von 1 auf 2 gehoben — deshalb nicht gemacht.**

**Bis dahin ist nichts umgestellt.** `CameraVideo`, `TrackerCamera` und die Anfrage sind unberuehrt,
`grep -rn "bindToLifecycle" android/app/src/main/ | wc -l` steht weiter auf 1.

## Aufnahmeprofil gebaut (2026-09-13) — und ein Bruch zwischen 01 und dem Schema

**Gebaut, wie `02-erfassungs-modus.md` es nach der Korrektur festlegt:** die Erfassung faehrt
3840x2160 / 15 fps / **67 Mbit/s**, der Partieweg 1440p / 15 fps / **30 Mbit/s** (vorher 20).
`VIDEO_BIT_RATE` ist vom `const` zum Parameter geworden (`CameraVideo.bitRate`,
`DEFAULT_VIDEO_BIT_RATE`), das Profil liegt temporaer auf derselben EINEN Kamerabindung
(`TrackerCamera.applyCaptureProfile` → `retarget`) und wird beim Verlassen zurueckgenommen.
`bindToLifecycle` steht weiter auf **1**.

**Nichts faellt still zurueck.** Vor dem `configure` fragt `agreedProfile` die
`MediaCodecInfo.CodecCapabilities`: Groesse, Bildrate und Bitratenbereich. Jede Abweichung wird
geklemmt, in den Logcat geschrieben, auf dem Aufbau- und Dreh-Schirm angezeigt (rot statt Akzent)
und als `notes` in `capture.json` gelegt. Eine NICHT gepinnte AE-Spanne erscheint dort als
fehlendes `ae_fps_range` — also als „die Kamera lief frei", nicht als stille hoehere Bildrate.

**Was gemessen in der Aufnahme landet:** `capture.json` traegt jetzt `recording` mit
`requested_size`, `delivered_size` (am `ImageProxy` gelesen), `requested_fps`, `ae_fps_range`,
`requested_bit_rate`, `bit_rate` und `notes`. `session.yaml` traegt `video_bit_rate_requested` und
`video_bit_rate`.

### Der Bruch: 01 liest `video_frame`, das Schema fuehrt `elapsed_ns`

`src/chesslab/capture_import.py:35-39` verlangt je Schritt ein `video_frame` und bricht sonst ab
(„traegt kein `video_frame` — Abbruch statt Bretter unter geratenen Namen"). Der String
`elapsed_ns` kommt in `src/chesslab/` und `tests/` **gar nicht vor**. 02 schreibt nach dem
aktuellen Schema `elapsed_ns` und KEIN `video_frame`. **Jedes Buendel, das dieser Modus aufnimmt,
laesst `chesslab capture import` abbrechen.** Ich habe Python nicht angefasst (Auftrag). 01 muss
nachziehen: `elapsed_ns` ueber die `video_sync`-Zeilen der `timeline.jsonl` zur Videozeit und
daraus zum Index — derselbe Weg, den `PhoneCandidate.kt:550` fuer eine Partie geht.

### Was beim Bauen sonst gegen die Spec stand

| Befund | wie geloest |
|---|---|
| „Nichts in `:tracker-runtime` aendern" (Phasendatei) gegen „die tatsaechliche Bitrate gehoert in `session.yaml`" (Auftrag) | Der Auftrag sticht: `SessionVideoMeta` traegt zwei neue Felder mit Vorgabe 0, `writeSessionYaml` schreibt sie nur, wenn sie gesetzt sind. Eine alte Aufnahme sagt damit gar nichts statt „mit 0 aufgenommen". **Die Abnahmezeile „`git diff --name-only` nennt keine Datei unter `android/tracker-runtime/`" gilt fuer 02 damit nicht mehr** |
| „`CameraVideo` nicht umbauen — nur benutzen" (Do NOT) gegen „`VIDEO_BIT_RATE` wird zum Parameter" | Der Auftrag sticht. `CameraVideo` hat zwei neue Felder, eine neue private Funktion und den Bytes-Fix; die Encoder-Lebensdauer ist unberuehrt |
| `capture.json` hat `additionalProperties: false`, das gemessene Profil passte in keinen Schluessel | `docs/capture-session.schema.json` gehoert laut Register **02**. Ein optionaler `recording`-Block ist dazugekommen, nichts weggenommen. 01 liest nur `steps` und ist davon unberuehrt |
| `SessionCaptureController.capReached` misst die Videogroesse ebenfalls als `File(dir, "video.mp4").length()` | **Nicht angefasst** (`:tracker-runtime`, und es ist die Speicherkappe, nicht die Metadaten). Die Kappe unterschaetzt damit lange Aufnahmen um denselben Faktor wie `video_bytes` vorher — gemeldet, nicht repariert |

### `video_bytes` — Ursache und Grenze der Pruefung

`stopInternal` nahm `outputFile?.length()?.takeIf { it > 0L } ?: encodedBytes`. `outputFile` ist
**Segment 0**, also `video.mp4` allein, und weil es > 0 war, kam der mitlaufende `encodedBytes` nie
zum Zug. `writtenBytes()` summiert jetzt `(0..segment)` nach `releaseEncoder()`, also wenn der
letzte Muxer seinen Index geschrieben hat. **Kein JVM-Test dafuer**: `CameraVideo` braucht
`MediaCodec`/`MediaMuxer` und laeuft nicht auf dem Desktop. Nachweis ist die naechste echte
Aufnahme — `video_bytes` gegen `du -sb` des Session-Ordners.

### 10 fps — geprueft, nicht eingebaut

`pinFrameRate` waehlt ausschliesslich aus `CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES` und nimmt die
ENGSTE Spanne, deren Obergrenze die eingestellte Bildrate ist. Findet es keine, pinnt es gar nichts
und die Kamera laeuft frei — der Kommentar an der Stelle haelt fest, dass die Rueckkamera des
24117RK2CG **keine gesperrte Spanne unter 15** anbietet. Welche Spannen das Geraet wirklich
meldet, steht **nirgends im Repo**; der Code liest sie nur zur Laufzeit und loggt sie
(`AE target fps range pinned to … (of …)`). Ohne Geraet ist das nicht zu beantworten. Neu ist, dass
die Antwort jetzt aufgeschrieben wird: `ae_fps_range` in `capture.json` ist `null`, wenn nichts
gepinnt wurde. **15 bleibt die Vorgabe, 10 ist nicht eingebaut.**

## Session log

**2026-09-12 — Phasen 00 und 03.** `src/chesslab/capture_plan.py` (neu, traegt `BANDS`),
`scripts/coverage_gaps.py` (Achsenblock), `chesslab capture plan`,
`docs/capture-plan.schema.json`, `docs/capture-axes.md`, `platform/app/lib/capture-plan.ts`
plus `/api/capture/plan` und `/api/capture/coverage`. Tests: `tests/test_capture_plan.py` 19
gruen, `lib/capture-plan.test.ts` 4 gruen (401-Zweig darunter), `ruff` und beide
Kommentarbudgets sauber, `tsc --noEmit` sauber.

Danach Backfill (376 640 Zeilen), Karte und Plan neu: 46 Auftraege statt 58.

**Naechster Schritt, exakt:** nach dem Ablationslauf `manifest-bright.jsonl` ueber
`manifest.jsonl` schieben. Dann Phase 01 (Import ohne Kandidaten-Maschinerie).

**2026-09-13 — Phase 02, Steps 1 und 2.** `fenOf(Map<String,String>, blank)` in
`core-engine/.../board/ReadingFen.kt`, `fenOf(snap)` ruft sie; der Referenzwert
`4k1n1/8/8/4p3/3P4/8/8/R3K3 w - - 0 1` wurde VOR dem Umbau gegen den alten Code gemessen und steht
als `ReadingFenTest.REFERENCE`. Dazu `app/.../capture/CapturePlan.kt` und `CapturePlanClient.kt`:
Typen des Plan-Schemas, `ignoreUnknownKeys`, 401 als sichtbare Kopplungs-Meldung.
Gates: `:core-engine:test --tests *ReadingFenTest*` 4 gruen, `:app:testDebugUnitTest --tests
*CapturePlanTest*` 4 gruen, `:app:ktlintCheck` gruen, `comment_budget.py` ohne neue Eintraege.
Steps 3 und 4 nicht begonnen — siehe Blocker oben.

**2026-09-13 — Phase 02, Steps 3 und 4.** Neu: `app/.../capture/CaptureRecorder.kt` (Naht +
`CaptureRecorderHost`), `CaptureHost.kt` (Zustand ueber drei Back-Stack-Eintraege),
`CaptureScreens.kt` (Plan, Aufbau, Drehen), `CaptureSession.kt` (`capture.json`),
`LiveCaptureRecorder.kt` (`SessionRecorder` + `RecordingBundleHost` ohne Partie). Geaendert:
`ChesslabNavHost.kt` (drei Ziele), `ui/settings/SettingsScreen.kt` (Einstieg neben Transfer),
`service/TrackerService.kt` (veroeffentlicht den Recorder, raeumt ihn in `onDestroy` ab).
Gates: `:app:testDebugUnitTest --tests *CaptureRunTest* --tests *CapturePlanTest*` 4+4 gruen,
`:app:ktlintCheck` gruen, `comment_budget.py` ohne neue Eintraege. Nicht gelaufen: `:app:detekt`,
`:app:assembleDebug`, `CommentBudgetTest` — der Rechner fuhr Fold-Trainings, jeder Gradle-Aufruf
lief nur bei null laufenden Trainern (24 min gewartet).

**2026-09-13 — Aufnahmeprofil und der Bitraten-Umbau.** `fix(record): video_bytes zaehlt alle
Segmente` und `feat(capture): 4K, 15 fps und eine eigene Bitrate`. Angefasst: `CameraVideo.kt`
(Bitrate als Parameter, `agreedProfile`, `writtenBytes`), `CaptureProfile.kt` (neu),
`TrackerCamera.kt` (`CaptureProfilePort`, `pinnedFpsRange`), `RecordingBundleHost.kt`,
`SessionRecorder.kt` (`:tracker-runtime`, zwei Felder), das `capture`-Paket,
`docs/capture-session.schema.json` (`recording`). Gates: `:app:testDebugUnitTest` ueber
`CaptureRunTest` (6), `CapturePlanTest` (4), `SessionRecorderTest` (7) und
`RecordingBundleHostTest` (5) gruen, `:app:ktlintCheck` und `:tracker-runtime:ktlintCheck` gruen,
`comment_budget.py` ohne neue Eintraege (zwei eigene KDoc-Bloecke dafuer von 8/9 auf 6 gekuerzt).
Jeder Gradle-Aufruf erst nach `trainers.ps1` = 0.
