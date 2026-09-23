# Bretter ausschneiden: Dekodieren, Schneiden, Entzerren

Wo die Zeit eines `realgames export-session` hingeht und welche Interpolation welcher Warp nimmt.
Gemessen an `2026-08-30-16-20-19` (262 Zeilen, 12 Segmente, 1440×2560), Wanduhrzeit echter Läufe.
Tempo des Composite-Ingests vom Drehteller: `docs/occluder-plates.md`.

## Ergebnis (2026-09-08)

| Phase | vorher | heute |
|---|---:|---:|
| Rotation + Settle | ~49 s | **9,5 s** |
| Grid-Fit | ~87 s | **11,1 s** |
| Bretter schneiden | ~87 s | **7,1 s** |
| **gesamt** | **~223 s** | **27,8 s** |

Nachgewiesen: ein voller Re-Export liefert alle Bretter bytegleich und alle 262 Zeilen identisch.
**Ein zweiter Lauf ist schneller, ohne dass etwas besser wurde:** er startet auf den gefitteten
Ecken des ersten und fittet 13 statt 125 Frames nach — nie zwei Läufe derselben Session als A/B.

## 1. `grab` statt `read` für die Frames, die niemand will

Der Export will **11 %** der Frames. `cap.read()` ist `grab()` + `retrieve()`, und `retrieve`
(BGR-Konvertierung) ist der Preis: `read` 10,43 ms, `grab` 1,96 ms je Frame, am echten Zeilensatz
25,5 s → 4,7 s je Durchlauf. `Recording.frames(wanted=…)` bezahlt nur die gewollten — bitgleich
(`test_wanted_yields_the_same_pictures_it_would_have_decoded`). Nutzer: `stream_frames`,
`decode_frames`, `framescan.scan_video`.

**`measure_settle` ist ausgenommen:** seine Cluster sind per Konstruktion lückenlos, ein `wanted`
wäre dort der ganze Bereich.

## 2. Das Kodieren überlappt das Dekodieren

`imwrite` ist 73 % der Schneide-Phase (50 ms je 928-px-Brett bei WebP-Qualität 95, die eine
Datenentscheidung ist und bleibt). `cv2.imwrite` gibt das GIL frei: `BOARD_WRITERS = 4` Threads,
66,3 s → 22,8 s. **Vier und nicht mehr** — ein Frame in Flug ist 11 MB, und die Abstürze dieser
Maschine sind Speicher. Gefahrlos, weil `retrieve()` je Frame einen **eigenen** Puffer liefert;
ein wiederverwendeter hätte das nächste Bild unter dem alten Namen geschrieben.

## 3. Die Phasen laufen in Prozessen (`--workers`, Vorgabe 4)

- **Die Segment-Zählung stimmt exakt** (11 × 900 + 671 über 12 Segmente); der globale Index eines
  Segments ist die Summe davor.
- **Ein Seek ist NICHT exakt:** 2 von 7 Sonden lieferten andere Pixel, während
  `CAP_PROP_POS_FRAMES` den gefragten Index meldete. Ein Worker startet an der Segmentgrenze
  (`Recording.segment_base`) und läuft mit `grab` vor (1,3 ms je Frame).
- **Zusammenhängende Strecken** (`plan_chunks`), nie reihum — sonst liefe jeder Worker durch die
  ganze Aufnahme. Zurück kommen Zeilen, nie Bilder.
- **Ein Abschnitt darf nie sein eigenes Mesh poolen.** `meshes_for_boards` mittelt über alle
  sauberen Frames der Aufnahme; der Elternteil rechnet es einmal.
- **Der Median wird aus den Zeilen neu gebildet**, nicht aus Teilmedianen gemittelt.

Der Brett-Schnitt skaliert NICHT mit (33 s → 23 s, dann Sättigung): er ist decode-gebunden, und
`grab` kostet bei vier Prozessen 3,4 statt 1,4 ms. Der Grid-Fit ist rechengebunden und skaliert
(42 → 15 s). Encoder-Threads, Zielordner, `CAP_PROP_N_THREADS`, Prozessstart und
Speicherbandbreite wurden gemessen und sind es nicht.

`measure_settle` seekte früher auf `cluster_lo` und lief damit auf teils falschen Bildern; es
startet jetzt ebenfalls an der Segmentgrenze.

## 4. Die Geometrie-Arbeit

- **Die Drehung war doppelt:** OpenCV dreht nach Container-Metadaten automatisch, der Export drehte
  zurück. `_combined_rotation` fasst beide zusammen. Die Winkel ADDIEREN — gemessen auf drei
  Aufnahmen: `ROTATE_90_CLOCKWISE` aufs rohe Bild ergibt das auto-gedrehte, das `META` 90 nennt.
  Unsere Aufnahmen heben sich alle auf (90 + 270), und eine Aufhebung beweist die Konvention nicht.
- **Mesh-Koordinatenkarte gecacht** (`calibration._crop_mesh_coordinates`, Schlüssel: Brettgröße,
  Rand, alle Mesh-Werte; Homographie und Linse weiter je Frame). Mesh, Homographie und Linse sind
  EIN kubischer Remap, kein Warp mit nachgelagertem Geradeziehen. Brett-Phase 23 → 7 s — **eine
  obere Schranke**: `scripts/benchmark_export_warp.py` fuhr `uncached` damals immer zuerst.
- **`_notch_centre`** löst die Schulter-Basislinie analytisch statt über `polyfit`; dasselbe
  lineare Modell, Linienlagen weichen um höchstens 1,14e-13 px ab.
- **GPU bringt nichts:** OpenCL kostet mit Transfer 10,6 statt 2,1 ms je Remap. Hardware-Dekodierung
  ist auf diesem Rechner zu (kein D3D11 im pip-Wheel, `rocDecode` ist Linux/Instinct, unter Windows
  nur AMF ohne Python-Bindung).

**Offen, gemessen aber nicht angefasst:** `line_band_samples` ist 69 % des Grid-Fits (38 848
winzige `polyfit`/`lstsq` auf 40 Frames) — overhead-gebunden, der nächste Batching-Kandidat. Die
Farbkonvertierung zu batchen lohnt nach dem `grab`-Fix nicht mehr. `cv2.rotate` (19 % der
Settle-Phase) ließe sich in die Homographie ziehen, fasst aber Geometrie an, die Labels trägt.

## 5. Entzerrung: kubisch für Bilddaten, bilinear für Messungen (2026-09-14)

Echtes Brett (952×952), gleiche Perspektive, Median aus 7 Läufen, Laplace-Varianz (Quelle 1 059,8):

| Arm | ms | Anteil der Quelle |
|---|---|---|
| `warpPerspective` bilinear | 1,33 | 63,6 % |
| `warpPerspective` kubisch | 2,26 | 92,1 % |
| `remap` bilinear | 0,91 | 63,6 % |
| `remap` kubisch | 1,78 | 92,1 % |

- **Die Funktion ist für die Schärfe egal, die Interpolation nicht.** `remap` ist gratis schneller
  und bleibt; der Unterschied sind 63,6 % gegen 92,1 %.
- **Vereinheitlicht auf kubisch** (Nutzer: „dann waehle die bessere qualitaet und
  vereinheitliche"): der schnelle Zweig in `warp_padded` nimmt für den Crop-Warp
  `INTER_CUBIC`, der Mesh-Zweig war es immer. Gespeicherte Bretter ändern sich nicht — alle 14 449
  trugen `board_straightened`, waren also schon kubisch. Über ein Identitäts-Mesh weichen beide
  Zweige noch an einzelnen Randpixeln um 11 Graustufen ab (vorher 63, im Mittel 0,002;
  `test_both_warp_paths_resample_the_same_way`). Geometrie und Zeilen der Paritäts-Fixtures blieben,
  das Quad wich um 0,0 px ab; nur die PIXEL änderten sich.
- **Kosten:** unter 1 ms je Beobachtung (+0,62 ms bei 80 px, Brett 582), gegen 16 ms CNN.
- **Der Erkennungs- und der Gitter-Warp bleiben bilinear — das ist die eigentliche Entscheidung.**
  Eine Messung wird durch Schärfe nicht richtiger, nur anders skaliert, und jede Schwelle ist gegen
  die bisherige Weichheit geeicht: kubisch verschob der Gitter-Warp das gefittete Quad um
  **2,78 px**, der Ruhe-Vergleich wurde ~10 % empfindlicher (mittlere Zell-Differenz bei 0,3 px
  Versatz 2,76 → 3,02) gegen ein `SETTLE_LIMIT` von 45, und aus dem Erkennungs-Warp kommt alles, was
  `motionThr` und der Census diffen. Wer es trotzdem will, macht ein eigenes Vorhaben mit
  Nachmessen der Schwellen und A/B.
- **Nicht belegt ist der Nutzen:** Laplace-Energie ist ein Kantenmaß; mit bloßem Auge kaum
  sichtbar. Zeigen wird es sich erst an neu geschnittenen Packs, gemessen mit `chesslab eval` gegen
  denselben Val-Satz, ohne zweite Änderung im selben Lauf. `sharp`-Werte alter `scan.jsonl` sind
  mit neuen nicht mischbar.
- **Bekannter Handel:** `crops_for_frame` entzerrt Frame UND Mesh zweimal (bilinear, dann kubisch),
  der Brett-Store einmal kubisch. Betrifft Komposite; der Kommentar an `warp_board_for_crops`
  beziffert ihn.
