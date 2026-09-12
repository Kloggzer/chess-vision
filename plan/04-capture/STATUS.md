# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | done | 2026-09-12; Planer, Schema, CLI, zwei Routen. 46 Auftraege auf der VOLLEN Karte, 46 eindeutige `id`. 18 pytest, 4 vitest gruen |
| 01 | 01-import.md | todo | |
| 02 | 02-erfassungs-modus.md | **blocked** | 2026-09-13; Steps 1 und 2 stehen (`fenOf(Map)`, Plan-Abruf). Steps 3 und 4 haengen an `video_frame` — siehe Blocker unten |
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

## Blocker 02 (2026-09-13): `video_frame` hat auf dem Geraet keine Quelle

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

Zwei Wege, beide brauchen eine Entscheidung ausserhalb dieser Phase:

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
