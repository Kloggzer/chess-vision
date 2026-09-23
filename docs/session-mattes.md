# Session-Matten — die Hand aus dem Video statt aus der Hand gelabelt

Warum `chesslab occluders alpha-worker` ein Modell benutzt, wo `occluded.py` bewusst keines
benutzt, und welche Verfahren dafür gegeneinander angetreten sind. Code: `chesslab/matte.py`.
Welche Frames der Worker überhaupt bekommt, entscheidet der Scan: `docs/frame-scan.md`.
Wozu die Alpha ausserdem dient, seit jedes Frame eine hat: `docs/position-check.md`.

> Alle Zahlen unten stammen von `rg-2026-08-08-00-39-57`, gemessen am 2026-08-18. Zeuge ist
> `grid_occlusion.hand_squares` — der einzige Sensor, der mit keinem Kandidaten Arithmetik teilt.

## Die Matte IST das Brett-Raster (2026-08-21)

Eine Alpha wird über das gespeicherte Brett gerechnet und hat dessen Maße (952 × 952 bei
`board_size` 928). Daraus folgt zweierlei, und beides ist gebaut:

- **Sie folgt dem Brett durch die Begradigung.** `realgames.straighten_boards` zieht Brett und
  Matte durch denselben Mesh, handkorrigierte Alphas eingeschlossen — sie werden mitgezogen, nie
  neu gerechnet. Eine gebogene Alpha gegen eine gerade Zelle wäre eine falsche Verdeckungszahl.
- **Die alten Zahlen bleiben gültig.** `matte.jsonl` wurde auf dem gebogenen Alpha mit dem
  Zell-Mesh gerechnet, heute liegt eine gerade Alpha unter einem geraden Schnitt. Nachgerechnet
  über 10 Frames von `rg-2026-08-08-11-55-19`: Median-Abweichung **0,0000**, p90 0,0098, max
  0,047 — gegen `PIECE_VISIBLE_MAX = 0,15`. Kein Neurechnen nötig.

## Der Ausgangspunkt

Die Kamera steht fest, die Stellung ist pro Intervall bekannt, also **ist** der Median der ruhigen
Frames der leere Hintergrund. Ein Pixel, das zu **keiner** der beiden angrenzenden Stellungen
passt, ist ein Occluder — die bewegte Figur fällt dabei automatisch heraus, weil sie am Startfeld
zur Nachher- und am Zielfeld zur Vorher-Referenz passt.

Das funktioniert, und es reicht nicht:

- **Haut ist auf hellem Ahorn weder heller noch bunter.** Gemessen auf 001191: Helligkeitsverhältnis
  1,01 und Chroma-Abstand 0,11 bei einem Schnitt von 0,22. Nur die Textur trennt dort, und auch die
  braucht ein Ruheband **pro Pixel** — sauberes Zellrauschen erreicht 0,30, die Hand liegt bei 0,45.
- **Beleuchtungsdrift ist der eigentliche Feind.** `rebalance` korrigiert eine globale Verstärkung,
  keine veränderte Kennlinie. Ply 55 f18 flaggte damit 877 k von 906 k Pixeln — 60 von 64 Feldern,
  während der grid-Zeuge 20 sah.

## Der Vergleich

248 Frames, 106 davon mit grid-bestätigter Hand. `far` = geflaggte Felder, die nicht einmal an ein
grid-Feld angrenzen; dort sitzen die Beleuchtungs-Ausbrüche. `FP` = Frames bzw. Zellen auf Frames,
auf denen der grid-Zeuge **keine** Hand sieht.

| Verfahren | Treffer | verpasst | extra | far | FP-Frames | FP-Zellen |
|---|---|---|---|---|---|---|
| Pixel-Score (klassisch) | 653 | 513 | 1826 | **1174** | 20 | 44 |
| + ViTMatte auf dessen Trimap | 177* | – | – | – | 4* | 5* |
| Tiefe (Depth Anything V2 S) | 340 | 826 | 645 | 418 | 4 | 7 |
| Tiefe ∩ Score | 306 | 860 | 491 | 300 | 1 | 1 |
| Score + Tiefe + grid + ViTMatte | 369 | 797 | 603 | 357 | **0** | **0** |

<sub>* ViTMatte lief nur im 32-Frame-Vorlauf mit; es verbessert die Kante, nicht die Fläche.</sub>

Was daraus folgt:

- **RVM und Tiefe haben null Falschflaggen**, weil sie **keine** Referenz vergleichen —
  Beleuchtungsdrift kann sie nicht treffen. Genau deshalb sind sie den Umweg wert.
- **SAM 2 mit Punkt-Saat und Propagation ist unbrauchbar**: 252 Falschzellen auf vier handfreien
  Frames. Es trackt weiter, nachdem die Hand weg ist, und `object_score_logits` bleibt dabei
  positiv — der eingebaute Presence-Schalter greift hier nicht.
- **Pro Frame detektieren statt propagieren** löst das strukturell: kein Treffer, keine Maske.

## Warum SAM 3

Gleiche Fläche wie Grounded SAM 2 (Grounding DINO + SAM 2.1), aber ein Modell statt zwei, und auf
handfreien Frames findet es **gar nichts** — Grounding DINO liefert dort Geister-Boxen mit 0,25–0,31,
die nur deshalb nicht durchschlagen, weil die Maske zu klein bleibt.

| Frame | grid | Score | Tiefe | Grounded SAM 2 | SAM 3 |
|---|---|---|---|---|---|
| 001080 (leer) | 0 | 0 | 0 | 0 | 0 |
| 001176 | 9 | 14 | 10 | 14 | 14 |
| 005745 | 7 | 34 | 10 | 13 | 12 |
| 007917 | 20 | 62 | 14 | 25 | 25 |

SAM 3.1 geht **nicht** über `transformers`: das Repo liefert nur `sam3.1_multiplex.pt`, keine
`model.safetensors`. Beide Repos sind gated (manuelle Freigabe) und stehen unter der SAM-Lizenz,
nicht unter Apache/MIT — für lokal erzeugte Labels unkritisch, für Ausgeliefertes nicht.

## Der Prompt

Substantivphrasen, einzeln geprompted, Masken vereinigt. Gemessen wurde neben den Zellen die
**Loch-Fläche**: Pixel, die die Maske umschließt aber nicht enthält.

| Prompt | leerer Frame | 001176 | 005745 (**Ring**) | 007917 |
|---|---|---|---|---|
| `hand, arm, sleeve, wristwatch` | 0 | 14 Zellen | 12 Z., **2074 px Loch** | 25 Z. |
| `arm with hand and accessories` | 0 | 3 | 0 | 0 |
| `person` | 0 | 10 | 13 Z., **4 px** | 21 |
| **`person` + Liste** | 0 | **14** | **13 Z., 4 px** | **25** |
| `not a chess piece` | 0 | 0 | 0 | 0 |
| Komplement (`chess piece` ∪ `chessboard`) | 0 | 14 | 13 | 27 |

- **Ein Ring ist ein Loch**, und ein Loch ist ein Label, das „Brett" sagt, wo Metall liegt. Das eine
  Wort `person` schließt es; keine Aufzählung tut das, weil niemand alle Accessoires vorhersieht.
- **Verneinung funktioniert nicht.** `not a chess piece` findet mit 0,91–0,93 Konfidenz genau das,
  was es ausschließen soll. Das „nicht" wird ignoriert.
- **Das Komplement funktioniert**, deckt sogar am meisten ab, hängt aber daran, dass die Brettmaske
  jedes Mal sitzt. Als Produzent deshalb die Liste, das Komplement als möglicher zweiter Zeuge —
  es ist die einzige Variante, die eine Kaffeetasse auf dem Brett fände.
- **Lange Beschreibungen sind schlechter als Substantive**: `arm with hand and accessories` kam auf
  0,53 Konfidenz und fiel dreimal ganz aus.

## Was übrig blieb (2026-08-18)

Grounding DINO und SAM 2.1 sind **entfernt**. Sie saßen zwischen den beiden Aufgaben und machten
keine davon besser:

- **Finden** macht der destillierte Hand-Gate im Frame-Scan (2,1 ms, `docs/hand-gate.md`). Erst
  löste RT-DETR das DINO ab (24,6 ms gegen 405 ms bei gleichem Urteil), dann der Gate das
  RT-DETR. Verkleinern ließ DINO sich nicht — bei 512 px flaggte es 23 von 24 sauberen Brettern.
- **Matten** macht SAM 3, weil nur dessen Kante ein Label trägt (Ring 4 px statt 96 px).
- Die Maske von SAM 2.1 war im Messlauf sogar gratis (482 ms gegen 511 ms für DINO allein) — sie
  hing nur an einem Detektor, den wir nicht mehr brauchen.

## Die Sperren

1. **Der Frame-Scan muss den Frame als `occluded` geführt haben.** Der destillierte Gate
   entscheidet, OB eine Hand da ist, SAM 3 nur WO. Der Gate ist auf SAM destilliert, hängt
   im Betrieb aber an keinem Foundation-Modell (`docs/hand-gate.md`).
2. ~~**Nur `occluded`, nicht `stale`.**~~ **Ueberholt seit 2026-08-22, aufgehoben 2026-09-14.**
   Die Begruendung war, die FEN muesse unter der Hand noch gelten. Seitdem entscheidet aber die
   ZELLE und nicht der Frame: `dirty_reason` steuert nur noch, was SAM zuerst mattet, und genau das
   rettet `stale`- und `changed`-Frames Zelle für Zelle (CLAUDE.md, `docs/position-check.md`).
   Die Stellung ist bekannt, unsicher ist nur der eine Zug, und die strittigen Zellen kommen über
   die Audit-Lane. Auch der Preis stimmte nicht mehr: **1,87 s je Frame**, gemessen 2026-09-14 über
   189 Alphas in 354 s, nicht 11,9 s.
3. **Zone über 60 % des Bretts → Frame verwerfen.** Das ist Licht, kein Arm.
4. Coverage wird mit demselben `crops_for_frame`-Aufruf geschnitten wie das Bild — die Label-Region
   ist per Konstruktion die Crop-Region, Mesh und Pads eingeschlossen.

Verpasste Hände kosten nichts, erfundene Flächen kosten das Training (User, 2026-08-18). Deshalb
Konsens statt Union: die Union aus Score und SAM 2 hatte die beste Trefferzahl (186) und war
trotzdem die schlechteste Wahl — sie erbt jede Falschflagge beider Seiten.

## Die Konnektivität im Loch-Test (2026-08-23)

`solid()` schrieb `connectedComponentsWithStats((1 - m), 4)`. Die 4 landete auf dem
`labels`-Ausgabeparameter, nicht auf `connectivity` — gemessen: positional 4 und positional 8
liefern dieselbe Komponentenzahl, erst `connectivity=4` trennt Diagonalnachbarn. Der Test lief
also mit der Vorgabe 8. Jetzt steht `connectivity=4` da.

**4 ist richtig**, weil der Hintergrund komplementär zum Vordergrund zählen muss: nach dem CLOSE
mit Ellipsen-Kernel ist die Maske 8-verbunden, und 8 auf beiden Seiten lässt eine Tasche über eine
Diagonale entweichen, die der Vordergrund als geschlossen führt.

**Richtung, gegen die Intuition:** 4 füllt *mehr*, nicht weniger — unter 8 fließt eine Tasche
diagonal zum Rand ab und gilt gar nicht erst als Loch. Der Schutz für den Hintergrund in der
hohlen Hand ist der **Größendeckel** (`MAX_HOLE_FRAC`), nicht die Konnektivität.

Gemessen, zwei Läufe. **Bestätigungslauf auf der ROHEN Union** (`alpha_sam3(fill=False)`,
fp32/Produktionseinstellung, 394 Frames aus `2026-08-08-00-39-57`, 2,90 s/Frame) — das ist genau
der Input, den `solid()` in Produktion sieht:

| | Pixel gesamt | gefüllt | große Löcher offen | Frames mit Unterschied | Label-Zellen gekippt |
|---|---|---|---|---|---|
| `connectivity=8` | 61 611 296 | 32 | 38 | — | — |
| `connectivity=4` | 61 611 296 | 32 | 38 | **0 / 394** | **0** |

Auf der rohen Union sind die beiden **bitgleich**, größte Coverage-Verschiebung 0,0.

Der Vorlauf auf 712 geparkten Alphas (`data/_parked/matte-seams-2026-08-22/`, Zustand vor
`close-seams`) fand einen einzigen abweichenden Frame — 006831, +218 px. Der ist ein **Artefakt der
Messung, kein Produktionsfall**: die geparkten Alphas sind schon einmal gefüllt (231 975 px gegen
231 378 px roh), und erst diese erste Füllung formt den Knöchel-Schlitz so um, dass die Tasche unter
8 diagonal abfließt. Auf der rohen Union finden beide Konnektivitäten dasselbe Loch (`small=1`).

**Kein Alpha auf der Platte muss neu geschnitten werden**, und das destillierte Hand-Gate hat aus
nichts gelernt, was sich hier ändert. Die Änderung ist eine Korrektheits-, keine Verhaltensänderung.

## fp16 fuer den Encoder (2026-08-23)

`alpha_sam3` rechnet unter `torch.autocast(float16)`. Der Vision-Encoder ist 77 % des Frames
(profiliert: 2,39 s von 3,11 s; die 5 Konzept-Decodes teilen sich das Embedding und kosten
zusammen 0,72 s — dort ist nichts zu holen).

**Produktionspfad gemessen, inkl. `solid()` und `coverage_of`, Warmup verworfen, n=20:**

| | s/Frame |
|---|---|
| fp32 | 2,866 (sd 0,034) |
| fp16 | **0,501** (sd 0,009) |

**5,72x.** Die nackte Sonde ohne Nachbearbeitung sagte 6,6x — `solid()` und `coverage_of` sind
CPU und skalieren nicht mit. Eine Session von 1 373 Frames faellt damit von ~1,1 h auf ~0,2 h.

**Abgesichert ueber 150 Frames gegen fp32:** 0 von 9 600 Coverage-Zellen kippen ueber
`PIECE_VISIBLE_MAX`, groesste Verschiebung 0,0079 gegen die Schwelle 0,15, IoU mean 0,99973
(min 0,99624). bf16 war gleich schnell, aber ungenauer (IoU 0,99828).

Nicht gemessen: ob die Abweichung im Rauschen der Maske selbst liegt. SAM 3 gibt bereits
binaere Masken zurueck (`mask_threshold=0.5`), es gibt also kein weiches Band zum Vergleichen —
der ehrliche Proxy waere die Randbewegung zwischen benachbarten Frames.

## SAMs Absage ist kein sauberes Brett (aus CLAUDE.md verschoben, 2026-09-23)

Eine `matte.jsonl`-Zeile mit `skipped` (`zone too big`: Alpha ueber 60 % des Bretts) traegt WEDER
`concepts` NOCH `coverage`. Zweimal wurde das als "nichts gefunden" gelesen: `hand_gate.gate_label`
lehrte dem Schueler die verdecktesten Bretter des Korpus als handfrei, und
`temporal_matte.adopt_proposals` zaehlte sie als "schon gemattet", so dass genau die Frames ohne
Alpha ungefuellt blieben und mit `coverage = 0.0` ins Training gingen. `matte.matte_status` filtert
richtig; wer `matte.jsonl` liest, prueft `coverage` auf `None`.

Die gespeicherte `coverage` ist ein Schnappschuss vom Matten und driftet gegen ihre Crops, sobald
ein Re-Export die Ecken verschiebt (gemessen 2026-09-16: 13 von 24 Aufnahmen, 0,10 % der Zellen
kippen ueber `PIECE_VISIBLE_MAX`, fast alle auf der Grundreihe) — `docs/coverage-weight-2026-09-16.md`.
