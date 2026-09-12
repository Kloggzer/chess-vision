# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | todo | |
| 01 | 01-erfassungs-modus.md | todo | |
| 02 | 02-messachsen.md | todo | |

## Dependencies

00 landet allein und zuerst. 01 und 02 laufen danach parallel; 02 testet gegen eine von Hand
geschriebene `capture.json` und braucht 01 nicht fertig.

## Manual steps

Die Aufnahmen macht der Nutzer: Stellung aufbauen, Licht stellen, Figur drehen, Hoehe aendern.
Kein Agent nimmt etwas auf.

## Notes / discrepancies

**Fuenf Pruefungen durch fremde Agenten, alle „nicht umsetzbar".** Fassung 6 ist die erste mit
einer anderen FORM, nicht nur anderem Text — und der Formwechsel loescht die meisten Befunde.

**Was die Form aendert.** Eine Aufnahme wird erst durch `export-session` zu Brettern, und der
verlangt ein `video.mp4` (`realgames.py:254-257`). Video heisst auf diesem Geraet den ganzen
Kamera-Stack: `CameraVideo.kt` ist ein handgeschriebener MediaCodec-Encoder (489 Zeilen), dazu
`PreRollRing`, `RecordingBundleHost` und die Verdrahtung in `TrackerCamera` — 1 737 Zeilen in
`:app`. Ein eigenes APK muesste sie duplizieren oder aus der ausgelieferten App herausoperieren;
der Pruefer hat gezeigt, dass `bindAnalysis()` (`TrackerCamera.kt:238-275`) mit `OpticsLock`,
`TorchLamp`, `ReconnectPolicy`, `CameraVideo` und `Camera2Interop` verflochten ist. **Ein Modus in
`:app` dupliziert nichts** — Entscheidung des Nutzers, 2026-09-12.

Damit entfallen ersatzlos: das zweite APK, das Modul `:board-setup`, die Extraktionsphase, die
eigene Kamerabindung, die Frage nach der OpenCV-Runtime und die nach dem `applicationId`.

**Was aus den Pruefungen uebrig blieb und jetzt behoben ist:**

| Befund | Antwort |
|---|---|
| `export-session` braucht ein Video | Der Modus nimmt auf wie jede Aufnahme; der bestehende Weg traegt sie |
| `fenOf(Map)` war als Verschiebung spezifiziert, `getValue` wirft aber bei einer Teilkarte | Als ENTSCHEIDUNG ausgeschrieben: `empty`-Vorgabe, und der `CnnSnapshot`-Weg bleibt bitgleich, weil er immer 64 Felder liefert |
| Verbund ueber Frame-Namen war falsch (`0000` gegen `000117`) | Ueber **`ply`** — er ueberlebt den Export und steht in jeder Manifestzeile |
| `place`: WELCHES Feld, war fuer 18 von 34 Auftraegen offen | Dieselbe Regel wie `reference_square`: das Feld naeher an der Bandmitte |
| `profile` aus der falschen `session.yaml` | `default` (Handy-Buendel), nicht `desktop` (Export) |
| Zwei Abnahme-Greps unerfuellbar (21 statt 1, 57 statt 1) | Auf `*/src/main/` eingeschraenkt und **ausgefuehrt**: liefern jetzt 1 und genau `ReadingFen.kt` |
| `capture.json` hatte drei Eigentuemer | Schema und Inhalt gehoeren 01, 02 liest |
| `id` kollidierte (58 Luecken, 24 Paare) | Band im Slug, mit Gegentest statt tautologischem Test |
| CNN-Check brauchte Assets aus `:app` | Gestrichen |
| `turntable` gehoert dem Drehteller | Alles heisst `capture` |

**Zahlen, dreifach nachgerechnet und bestaetigt:** 58 duenne Zellen, 34 Stellung, 24 Licht, 27 bei
null. `brightness` fehlt in 376 640 von 979 363 Zeilen (allen Kompositen). Verkuerzung 0,955–1,025,
Median 0,986 ueber die 24 Aufnahmen mit `corners`; der Datensatz traegt davon 23.

**`--rot90` +0,0245 ist gemessen** (7 gepaarte Seeds, p = 0,0078, `docs/plan-98/00-plan.md`). Der
Wert −0,046 in `docs/model-improvement-results-2026-08-27.md:66` ist 80 px ohne Flip ohne
Brettkopf auf einem anderen Datensatz. Beide stimmen.

**Offen:** Fassung 6 ist noch nicht geprueft. Und `01` fasst `:app` an — nicht umbauend, aber die
ausgelieferte App muss danach vollstaendig gruen sein.

## Session log

(leer)
