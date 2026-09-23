# Session-Matten — die Hand aus dem Video, nicht aus der Hand gelabelt

Wie eine Aufnahme ihre Verdeckung bekommt: SAM 3 mattet (`chesslab/matte.py`,
`occluders alpha-worker`), ein destillierter Schüler findet (`chesslab/hand_gate.py`), ein
zeitlicher Sensor füllt nach (`session temporal-pass`). Welche Frames gemattet werden:
`docs/frame-scan.md`; was die Alpha danach je Zelle entscheidet: dort §3. Warum Coverage ein
Ausgang und keine Klasse ist: `docs/occluder-plates.md`.

## 1. Die Matte IST das Brett-Raster (2026-08-21)

Die Alpha wird über das gespeicherte Brett gerechnet und hat dessen Maße (952 × 952 bei
`board_size` 928).

- **Sie folgt dem Brett durch die Begradigung.** `realgames.straighten_boards` zieht Brett und
  Matte durch denselben Mesh, handkorrigierte Alphas eingeschlossen — nie neu gerechnet.
- **Alte `matte.jsonl`-Zahlen bleiben gültig:** gebogen gegen gerade nachgerechnet, Median-
  Abweichung 0,0000, max 0,047 gegen `PIECE_VISIBLE_MAX = 0,15`.
- **Die gespeicherte `coverage` driftet nach einem Re-Export** (Ecken verschoben, Zahl stehen
  geblieben): `occluders recut-coverage --all` rechnet sie aus den Alphas neu;
  `docs/class-scheme.md`.

## 2. Warum SAM 3

Der klassische Weg — der Median der ruhigen Frames ist der leere Hintergrund, ein Pixel, das zu
keiner angrenzenden Stellung passt, ist Occluder — reicht nicht:

- **Haut ist auf hellem Ahorn weder heller noch bunter** (Helligkeitsverhältnis 1,01, Chroma-Abstand
  0,11 bei Schnitt 0,22). Nur Textur trennt, und die braucht ein Ruheband pro Pixel.
- **Beleuchtungsdrift ist der eigentliche Feind.** `rebalance` korrigiert eine globale Verstärkung,
  keine veränderte Kennlinie: ply 55 flaggte roh 877 k von 906 k Pixeln, 60 von 64 Feldern, auf
  einem Brett, das niemand angefasst hatte, während der Rillen-Zeuge 20 sah.

Verfahren, die **keine Referenz vergleichen** (Tiefe, Matting-Modelle), haben null Falschflaggen,
weil Drift sie nicht trifft. **Pro Frame detektieren statt propagieren:** SAM 2 mit Punkt-Saat und
Propagation trackte weiter, nachdem die Hand weg war (252 Falschzellen auf vier handfreien Frames),
und sein Presence-Schalter griff nicht. SAM 3 deckt so viel ab wie Grounding DINO + SAM 2.1, ist
ein Modell statt zwei und findet auf handfreien Frames **nichts**. DINO und SAM 2.1 sind entfernt.
SAM 3.1 geht nicht über `transformers` (nur `sam3.1_multiplex.pt`); beide Repos sind gated und
stehen unter der SAM-Lizenz — für lokal erzeugte Labels unkritisch, für Ausgeliefertes nicht.

**Der Prompt:** `person` plus `hand, arm, sleeve, wristwatch`, einzeln geprompted, Masken vereinigt.

- **Ein Ring ist ein Loch** — ein Label, das „Brett" sagt, wo Metall liegt (Liste allein: 2 074 px
  Loch). Das eine Wort `person` schließt es (4 px); keine Aufzählung sieht alle Accessoires vorher.
- **Verneinung funktioniert nicht:** `not a chess piece` findet mit 0,91–0,93 genau die Figuren.
- **Lange Beschreibungen sind schlechter als Substantive.**
- **Das Komplement** (`chess piece` ∪ `chessboard`) deckt am meisten ab und ist der einzige Weg, eine
  Kaffeetasse zu finden, hängt aber daran, dass die Brettmaske jedes Mal sitzt — möglicher zweiter
  Zeuge, nicht Produzent.

**Löcher:** `solid()` füllt Löcher mit `connectivity=4` (komplementär zum 8-verbundenen
Vordergrund); der Schutz für den Hintergrund in der hohlen Hand ist der Größendeckel
`MAX_HOLE_FRAC`, nicht die Konnektivität. Auf der rohen Union bitgleich zu 8, kein Alpha musste neu.

**fp16:** `alpha_sam3` rechnet unter `torch.autocast(float16)`; der Vision-Encoder ist 77 % des
Frames. Produktionspfad inkl. `solid()` und `coverage_of`: fp32 2,866 s, fp16 **0,501 s** je Frame
(5,72x). Über 150 Frames gegen fp32: 0 von 9 600 Zellen kippen über `PIECE_VISIBLE_MAX`, größte
Verschiebung 0,0079, IoU mean 0,99973. bf16 gleich schnell, aber ungenauer (IoU 0,99828).

## 3. Die Sperren

1. **Der Hand-Gate entscheidet, OB eine Hand da ist, SAM 3 nur WO** (§4).
2. Seit 2026-09-14 werden auch `stale`- und `changed`-Frames gemattet — die Zelle entscheidet, nicht
   das Frame (`docs/frame-scan.md` §3). Gemessen 1,87 s je Frame.
3. **Zone über 60 % des Bretts → Frame verwerfen.** Das ist Licht, kein Arm.
4. Coverage wird mit demselben `crops_for_frame`-Aufruf geschnitten wie das Bild — die Label-Region
   ist per Konstruktion die Crop-Region, Mesh und Pads eingeschlossen.

Verpasste Hände kosten nichts, erfundene Flächen kosten das Training (Nutzer, 2026-08-18): Konsens
statt Union.

**SAMs Absage ist kein sauberes Brett.** Eine `matte.jsonl`-Zeile mit `skipped` (`zone too big`)
trägt WEDER `concepts` NOCH `coverage`. Zweimal als "nichts gefunden" gelesen: `gate_label` lehrte
dem Schüler die verdecktesten Bretter als handfrei, und `temporal_matte.adopt_proposals` zählte
sie als gemattet, so dass sie mit `coverage = 0.0` ins Training gingen. `matte.matte_status` filtert
richtig; **wer `matte.jsonl` liest, prüft `coverage` auf `None`.**

## 4. Der Hand-Gate — SAM 3 auf den eigenen Aufbau destilliert

> Ein INGEST-Werkzeug, kein Tracker-Modell. Auf dem Handy bleibt Coverage ein Ausgang am
> Figuren-CNN (`training/occlusion.py`). Nichts hiervon geht ins APK.

**Warum ein Schüler:** auf den 91 `clean`-Frames, auf denen SAM etwas fand (2026-08-22), sahen
`skin_patch` und Rillen **0 von 91**, und RT-DETRs `person`-Verteilung war deckungsgleich mit der
auf SAM-freien Frames — Schwelle 0,10 hätte 67/91 gefangen und 83,3 % saubere verworfen. Der
Occlusion-Kopf des Figuren-CNN verpasst bei seiner besten Schwelle **34 von 59** und wäre als
Torwächter zirkulär.

**Der Lehrer,** `gate_label`: **Hand**, wenn ein Konzept feuert UND die Maske mehr als
`GATE_AREA_MIN = 0,25` Felder bedeckt; **frei**, wenn kein Konzept feuert und die Fläche 0 ist;
dazwischen kein Lehrer. `skipped`-Zeilen sind ungemessen, nicht frei (§3).

**Der Schüler:** ein Backbone, 65 Spalten — das Veto, dann 64 Coverage-Werte.

- **Kein Decoder, keine Pixelmaske:** die 64 Zahlen sind das Produkt, das `matte.jsonl` speichert.
- **Die 64 Werte hängen an ihrem eigenen Bildausschnitt:** Feature-Karte auf 8×8 gepoolt, 1×1-Conv
  je Feld. Global gepoolt mit Rand lag er bei Recall 0,9198 / Präzision 0,9312.
- **Der Brettrand wird abgeschnitten** — 12 px auf 952 sind ein Viertel Feld Versatz.
- **Bildzeile 0 ist Reihe 8**, `all_squares()` beginnt bei a1 — genau ein Kippen
  (`grid_to_squares`). Ein Fehler dort bliebe plausibel und unsichtbar.
- **Keine Rotation, Spiegelung oder Versatz** in der Augmentierung; nur Licht variiert.
- **Geprüft auf ganzen zurückgehaltenen Sessions**, nie auf Frames derselben Beleuchtung. Für das
  Veto zählt der Recall: `pick_threshold` nimmt die höchste Schwelle, die ihn hält. Gespeichert wird
  die Epoche mit dem besten `gate_score`, die letzte als `last.pt` daneben.

**Ergebnis** (`mobilenetv4_conv_small` @ 640 px, vier zurückgehaltene Sessions, 2 641 Bretter):
Veto-Recall 1,0000 bei 5 von 994 sauberen Brettern verworfen; Felder über `PIECE_VISIBLE_MAX`
Recall 0,9852, Präzision 0,9810; Coverage-MAE 0,0042 (der Occlusion-Kopf des Zell-Klassifikators:
0,0162); **2,1 ms je Brett** gebatcht gegen SAMs 2,76 s. Im Frame-Scan 9,0 ms je Frame.
EfficientNet-B0 kostet bei gleicher Auflösung das 5,8-Fache an Zeit; `mobilenetv4_conv_small_035`
wäre schneller, hat in timm aber keine Gewichte.

**Vier Fallen im Trainingscode** (ohne sie keine Epoche in 20 Minuten):
`MIOPEN_FIND_MODE=FAST` in `hand_gate.miopen_fast()` vor der ersten Faltung; bf16 und
`channels_last`; kein `float(loss)` je Batch (synchronisiert die GPU); `persistent_workers`.

## 5. Der zeitliche Sensor — SAM ist die Basis, temporal nur Upsert

`chesslab session temporal-pass <name>` ist eine Kettensprosse zwischen `matte` und `model-read`
(web: **Hände nachmatten**) und fährt: `temporal-scan` → `temporal-mattes --workers 4` →
`temporal-adopt` → `occluders alpha-worker --temporal` (nur wenn etwas adoptiert wurde) →
`temporal-upsert` → `realgames position-flags`. Marker ist
`data/reports/temporal-mattes/<name>/pass.json` mit `_source`-Stempel.

- **`temporal-scan`** vergleicht jede Zelle mit dem Pixel-Median von mindestens fünf anderen
  `boards/`-Frames mit genau demselben Ply und FEN — ohne SAM-Masken. `temporal_raw`: mittleres
  RGB-Residuum nach Helligkeitszentrierung; `temporal_normalized`: geteilt durch den RMS-Kontrast
  der Referenz (Boden 8). Kein kalibrierter Wert. Zellen über `TEMPORAL_AUDIT_CUT` (0,4) werden
  Karten mit Grund `temporal` („Hand oder Stellung prüfen"), nie ein Coverage-Anspruch. Veraltete
  Quelle → `position-flags` warnt und lässt sie weg. `--reference-stock all` nur als
  Empfindlichkeitsprobe, der Median kann dann Hände enthalten.
- **`temporal-mattes`** schlägt je geflaggtem Frame eine Alpha aus den nächsten sauberen Nachbarn
  beidseits vor (≤ 5 s, höchstens ein Ply dazwischen; je Seite Median bis `--peers` 5). Pixel
  müssen von BEIDEN Platten abweichen. `--method local` fittet I = t·B + F je Fenster, vertraut
  nur 0 ≤ t ≤ 1. Inseln unter `TEMPORAL_MATTE_MIN_AREA` (0,6 % des Rasters; eine Fingerspitze sind
  ~1,5 %) fallen weg. Bewusst unempfindlich (Nutzer, 2026-09-11): ein schwacher Schleier ist keine
  Hand. `refine_edges` (Closed-Form-Matting, `pymatting`) lässt den Rand der Bildkante folgen.
  Alpha als 8-Bit-PNG. `--workers 4` auf der CPU schlägt `--device cuda`.
- **`temporal-adopt`** macht Vorschläge mit einer Zelle über `MATTE_DIRTY` zu Matte-Zeilen
  (`source: temporal`) — **nur für Frames ohne SAM-Zeile und ohne Matte-Datei**. Danach mattet SAM
  genau diese Frames; seine Zeile gewinnt in `read_matte`. Idempotent, weil der Kandidatenfilter
  die EIGENE Coverage ignoriert (`sam_matte`).
- **`temporal-upsert`** ersetzt die Matte eines Frames GANZ, wo SAM eine Zeile hat, aber nichts
  fand (keine Zelle über 0,15), und temporal eine Zelle über 0,5 — **nie zellweise** (Nutzer,
  2026-09-11). `source: upsert` mit `merged_at`; SAMs Datei bleibt als `<stem>.sam.webp`, eine
  `.fixed`-Alpha wird nie ersetzt, und die Matte-Lane öffnet ein Urteil älter als `merged_at` neu.

Über 23 Sessions (2026-09-11): Zell-Übereinstimmung 86,9 %, 154 Frames upserted, 3 229 blieben
bei SAM. SAMs Konturen sind die besseren; seine blinden Flecken sind eine dunkle Hand am Brettrand
und die Handy-Aufnahmen. Bekannter Falsch-Positiver: ein Armschatten auf der h-Linie — dafür ist
die Lane da.

**Das Audit** `scripts/sensor_agreement.py` (und `scripts/matte_cell_audit.py`) schreibt nichts
um. `settle_dev` ist KEIN unabhängiger Occlusion-Detektor: er benutzt SAM, und eine voll
maskierte Zelle hat Abweichung 0 bei `settle_seen = 0`. Das Audit trennt gemessene, ungesehene,
fehlende und ungültige Settle-Werte, zählt fehlende Coverage, nicht unterstützte Geometrie und
unlesbare Bretter ausdrücklich und nimmt Brettgröße und -rand aus der Zeile. Hohe Temporal-Werte
entstehen auch durch falsche Stellungen, Versatz, Schatten; ein dauerhafter Occluder in allen
Referenzen bleibt unsichtbar. **Keine Temporal-Werte automatisch zu Coverage-Labels machen.**
