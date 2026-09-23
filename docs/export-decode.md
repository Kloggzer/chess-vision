# Bretter ausschneiden: wo die Zeit hingeht (2026-09-08)

Gemessen an `2026-08-30-16-20-19` (262 Zeilen, 12 Segmente, 1440×2560, Index bis 2421).
Alle Zahlen sind Wanduhrzeit eines echten `export-session`, keine Schätzungen.

## Vorher und nachher

| Phase | vorher | Dekodieren | Prozesse | + Geometrie |
|---|---:|---:|---:|---:|
| Rotation + Settle | ~49 s | 49 s | 18 s | **9,5 s** |
| Grid-Fit | ~87 s | 42 s | 15 s | **11,1 s** |
| Bretter schneiden | ~87 s | 23 s | 23 s | **7,1 s** |
| **gesamt** | **~223 s** | **114 s** | **57 s** | **27,8 s** |

Die letzte Spalte ist die Geometrie-Arbeit (Abschnitt unten): die
zwischengespeicherte Mesh-Koordinatenkarte, das analytische `_notch_centre` statt `polyfit`, die
Settle-Zuschnitte nur noch auf den gebrauchten Feldern — und der größte Einzelposten, das
**Zusammenfassen zweier sich aufhebender Drehungen** (OpenCV dreht nach Metadaten automatisch, der
Export drehte zurück). Nachgewiesen: ein voller Re-Export liefert alle 269 Bretter bytegleich und
alle 262 Zeilen identisch zum vorher geprüften Stand.

Der Grid-Fit-Wert ist nicht ganz sauber vergleichbar: ein zweiter Lauf startet auf den bereits
gefitteten Ecken und fittet nur noch 13 statt 125 Frames nach. Der Dekodier-Anteil (−21 s) ist es.

## 1. `grab` statt `read` für die 89 %, die niemand will

Der Export fordert **11 %** der Frames an (262 von 2 422), dekodierte aber alle voll — und das
zweimal, einmal für den Fit und einmal für den Warp.

`cap.read()` ist `grab()` + `retrieve()`. `grab()` schiebt den Container weiter, `retrieve()` baut
das BGR-Bild. Auf diesem Material:

| | je Frame |
|---|---:|
| `read` | 10,43 ms |
| `grab` | 1,96 ms |

Am echten Zeilensatz: **25,5 s → 4,7 s je Durchlauf**, also 51 s → 9,4 s für beide.

`Recording.frames(wanted=…)` nimmt jetzt die gewollten Indizes entgegen. **Bitgleich** geprüft
(`test_wanted_yields_the_same_pictures_it_would_have_decoded`, und auf zwei echten Aufnahmen mit
maximaler Abweichung 0) — `retrieve` dekodiert genau den Frame, den `grab` geholt hat.

Nutzer: `stream_frames` (beide Export-Durchläufe), `decode_frames`, `framescan.scan_video`
(jeder 3.).

**`measure_settle` bekommt nichts davon**, und das ist kein Versehen: die Cluster-Bildung öffnet
einen neuen Cluster genau dann, wenn eine Lücke entsteht, also ist die Vereinigung der Fenster
innerhalb eines Clusters immer lückenlos. Ein `wanted` wäre dort exakt der ganze Bereich.

## 2. Das Kodieren überlappt das Dekodieren

Profil der Schneide-Phase: `imwrite` **73 %**, `warpPerspective` 2 %. Ein 928-px-Brett bei
webp-Qualität 95 kostet 50 ms. Die Qualität ist eine Datenentscheidung und bleibt.

`cv2.imwrite` gibt das GIL frei, also schreiben `BOARD_WRITERS = 4` Threads, während der Decoder
weiterläuft: **66,3 s → 22,8 s** (2,9×). Vier und nicht mehr, weil ein Frame in Flug 11 MB ist und
die Abstürze dieser Maschine Speicher sind.

Geprüft, dass das gefahrlos ist: `retrieve()` liefert für jeden Frame einen **eigenen** Puffer
(verschiedene Adressen, paarweise verschiedene Inhalte). Bei einem wiederverwendeten Puffer hätte
der Encoder das nächste Bild unter dem alten Namen geschrieben — eine stille Label-Verfälschung.

## 3. Die Phasen laufen in Prozessen

Was verteilt werden darf, war zuerst zu klären:

- **Die Segment-Zählung stimmt exakt.** Alle 12 Segmente von 20-19 melden, was ein voller
  Vorwärtslauf zählt (11 × 900 + 671). Der globale Index eines Segments ist also die Summe davor.
- **Ein Seek ist NICHT exakt.** 2 von 7 Sonden lieferten andere Pixel, während
  `CAP_PROP_POS_FRAMES` den gefragten Index meldete. Ein Worker startet deshalb an der
  Segmentgrenze (`Recording.segment_base`) und läuft mit `grab` vor — 1,3 ms je Frame.

Aufgeteilt wird in **zusammenhängende Strecken** (`plan_chunks`), nie im Reihum-Verfahren: sonst
liefe jeder Worker durch die ganze Aufnahme. Zurück kommen nur Zeilen, nie Bilder.

Nachgewiesen gleich, auf echtem Material (262 Zeilen): **Statistiken gleich, jede Zeile Feld für
Feld identisch, alle 262 Bretter bytegleich.**

Zwei Fallen, die dabei zu umgehen waren:

- **Ein Abschnitt darf nicht sein eigenes Mesh poolen.** `meshes_for_boards` mittelt über alle
  sauberen Frames der Aufnahme; vier Worker hätten vier Bretter-Sätze gegen vier verschiedene
  Messungen gerade gezogen, und die Naht wäre unsichtbar. Der Elternteil rechnet es einmal.
- **Der Median wird aus den Zeilen neu gebildet**, nicht aus den Teilmedianen gemittelt — jede
  gefittete Zeile trägt ihr `align_worst_px`, also ist die Zusammenführung dieselbe sortierte
  Liste wie beim seriellen Lauf.

### Warum der Brett-Schnitt nicht mitskaliert

| Worker | 1 | 2 | 4 | 6 |
|---|---:|---:|---:|---:|
| Grid-Fit | 42 s | — | **15 s** | — |
| Bretter | 33 s | 24,5 s | 23,1 s | 23,2 s |

Einzeln gemessen braucht jeder der vier Abschnitte ~9 s, perfekt parallel wären also 9,6 s. Der
Faktor 2,4 dazwischen ist exakt die gemessene Decoder-Degradation: `grab` kostet 1,4 ms bei einem
Prozess und 3,4 ms bei vieren. **Der Brett-Schnitt ist decode-gebunden, der Grid-Fit
rechen-gebunden** — deshalb skaliert der eine 2,8× und der andere 1,4×.

Was es NICHT ist, jeweils gemessen und verworfen: Encoder-Threads (1, 2 und 4 sind gleich schnell),
der Zielordner (Temp = Projektordner, also kein Virenscanner), `CAP_PROP_N_THREADS` (wird nicht
beachtet), der Prozessstart (`import chesslab.realgames` kostet 0,24 s und zieht kein torch), und
die Speicherbandbreite (webp-Kodieren skaliert linear: 8 → 47 Bretter/s über 6 Prozesse).

## Nebenbei ein Korrektheitsfehler behoben

`measure_settle` seekte auf `cluster_lo` — bei nachweislich ungenauem Seek. Diese Messung
entscheidet, ab welchem Frame ein Feld als gesetzt gilt, also lief sie auf teils falschen Bildern.
Sie startet jetzt an der Segmentgrenze; `wanted` hält den Vorlauf auf `grab`-Preis.

## Was übrig bleibt, gemessen aber nicht angefasst

Profil der Settle-Phase, bevor sie auf Prozesse ging:

| | Anteil |
|---|---:|
| `read` (1 630 Frames, alle gebraucht) | 51 % |
| `cv2.rotate` | 19 % |
| `resize` (104 256 Aufrufe) | 11 % |
| `warpPerspective` | 6 % |

- **`cv2.rotate`** schiebt 1 629-mal 11 MB um. Eine Homographie kann die Drehung mitnehmen: die
  ECKEN in die ungedrehten Bildkoordinaten rechnen und direkt warpen. Spart 19 % hier und
  Vergleichbares in `framescan` — fasst aber Geometrie an, die Labels trägt.
- **64 Crops je Frame**, wo `active` 2–4 Felder groß ist. `crops_for_frame` ist ausdrücklich die
  *eine* Quelle für den Trainings-Zuschnitt und die Live-Inferenz; ein Filter würde ihre Zusage
  „64 in der Reihenfolge `all_squares()`" brechen. 11 % sind das nicht wert.
- **Grid-Fit**: `line_band_samples` ist 69 % der Phase, darin 38 848 winzige `polyfit`/`lstsq` auf
  40 Frames. Overhead-gebunden, nicht rechengebunden — dieselbe Form wie der Trainings-Feed
  (`docs/batch-aug.md`), also der nächste echte Batching-Kandidat.

**Die Farbkonvertierung zu batchen lohnt nicht mehr.** Nach dem `grab`-Fix kostet sie 1,5 s von
4,7 s je Durchlauf, und eine GPU-Variante müsste die YUV-Ebenen erst hochladen.

## Export geometry optimization, 2026-09-08

The board exporter already composes mesh, homography and optional lens distortion into
one cubic remap. It does **not** run a perspective warp followed by mesh straightening.
The expensive repeated work was constructing the dense mesh coordinates in NumPy.

`calibration._crop_mesh_coordinates` now caches the normalized float64 coordinates by
board size, border and all mesh values. The homography and lens are still applied for
each frame, so changing corners remain effective. Arrays are read-only; two cache
entries retain about 30 MB at 952 x 952 per process. The operation order, interpolation
and WebP quality are unchanged. There is no persistent cache to invalidate on disk.

`alignment._notch_centre` solves the shoulder baseline analytically using symmetric,
centered coordinates instead of a general `polyfit` solver. This preserves the linear
least-squares model; floating-point rounding can differ. Other robust fits retain their
existing solvers because their weights and design matrices vary.

### Measurements

Session `2026-08-30-16-20-19`, 262 frozen log rows, unchanged pooled mesh and rotation.
The comparison uses copies of the same input rows and writes only to temporary outputs.

| Measurement | Previous code | Optimized |
| --- | ---: | ---: |
| Full board phase, one process / four writer threads | 40.035 s | 10.774 s |
| Full board phase, four processes | not measured in this comparison | 9.105 s |
| 12 real-frame line scans | 0.227 s | 0.179 s |
| 12 complete grid fits, identical input geometry | 2.108 s | 1.905 s |

All 262 encoded boards, row fields and statistics matched exactly in both optimized
board paths. The twelve complete fit results also matched exactly. Intermediate line
positions differed by at most 1.14e-13 pixels. Randomized regression tests compare
3,000 noisy/sloped/occluded profiles against the original polyfit detector, and warp
tests compare pixels while changing corners, border, mesh values and lens distortion.

A first board-phase pair measured 34.479 s versus 9.940 s while tests were also running;
the table uses the repeat without concurrent tests. These are phase measurements, not
a new end-to-end export benchmark; previous cold/warm export totals are not comparable.

OpenCL was available and enabled. A warmed cubic remap of a real frame, with resident
maps and upload/download on every invocation, averaged 10.647 ms versus 2.138 ms on CPU
over 30 iterations. GPU timing included synchronization. Pixels matched, but this path
was slower, so no OpenCL dependency or global backend change was introduced.

### Reproduce the board comparison

Run from the repository using the existing environment:

```powershell
$env:PYTHONPATH = 'src'
.venv/Scripts/python.exe scripts/benchmark_export_warp.py 2026-08-30-16-20-19
```

The script compares cached and uncached construction with one process and the normal
writer pool, and verifies encoded hashes, rows and statistics. `--limit 12` is a quick
smoke check. Session files are read only; temporary encoded boards are cleaned up.

## Aus CLAUDE.md verschoben (2026-09-23)

- `cap.read()` ist `grab()` + `retrieve()`: `read` 10,4 ms je Frame gegen `grab` 1,96 ms, am echten
  Zeilensatz 25,5 s -> 4,7 s je Durchlauf, bitgleich. `imwrite` war 73 % der Schneide-Phase
  (50 ms je 928-px-Brett bei Qualitaet 95); vier Schreiber brachten 66,3 s -> 22,8 s.
- Die Drehwinkel ADDIEREN (`_combined_rotation`), gemessen 2026-09-08 auf drei Aufnahmen:
  `ROTATE_90_CLOCKWISE` aufs rohe Bild ergibt das auto-gedrehte, das `META` 90 nennt. Unsere
  Aufnahmen heben sich alle auf (90 + 270), und eine Aufhebung beweist die Konvention nicht.
- Seek: 2 von 7 Sonden lieferten andere Pixel, waehrend `POS_FRAMES` den gefragten Index meldete.
- GPU: OpenCL kostet mit Transfer 10,6 statt 2,1 ms je Remap; Hardware-Dekodierung ist auf diesem
  Rechner zu (kein D3D11 im pip-Wheel, `rocDecode` ist Linux/Instinct, unter Windows nur AMF ohne
  Python-Bindung).
- Die Mesh-Koordinatenkarte (23 -> 7 s) wurde gemessen, als `benchmark_export_warp.py` `uncached`
  immer zuerst fuhr; seit 2026-09-23 wechselt das Skript die Reihenfolge ab. Bis zu einer neuen
  Messung ist die Zahl eine obere Schranke.
