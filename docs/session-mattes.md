# Session-Matten — die Hand aus dem Video statt aus der Hand gelabelt

Warum `chesslab occluders alpha-worker` ein Modell benutzt, wo `occluded.py` bewusst keines
benutzt, und welche Verfahren dafür gegeneinander angetreten sind. Code: `chesslab/matte.py`.
Welche Frames der Worker überhaupt bekommt, entscheidet der Scan: `docs/frame-scan.md`.

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

- **Finden** macht jetzt RT-DETR im Frame-Scan: 24,6 ms gegen DINOs 405 ms, bei gleichem Urteil
  (`docs/frame-scan.md`). Verkleinern ließ DINO sich nicht — bei 512 px flaggte es 23 von 24
  sauberen Brettern.
- **Matten** macht SAM 3, weil nur dessen Kante ein Label trägt (Ring 4 px statt 96 px).
- Die Maske von SAM 2.1 war im Messlauf sogar gratis (482 ms gegen 511 ms für DINO allein) — sie
  hing nur an einem Detektor, den wir nicht mehr brauchen.

## Die Sperren

1. **Der Frame-Scan muss den Frame als `occluded` geführt haben.** Drei Zeugen entscheiden, OB
   eine Hand da ist (Rillen, RT-DETR, `skin_patch`), das Modell nur WO. Damit hängt kein Frame
   allein an einem Foundation-Modell.
2. **Nur `occluded`, nicht `stale`.** Ein Alpha über einer Stellung, die niemand kennt, ist 11,9 s
   für nichts — die FEN muss unter der Hand noch gelten.
3. **Zone über 60 % des Bretts → Frame verwerfen.** Das ist Licht, kein Arm.
4. Coverage wird mit demselben `crops_for_frame`-Aufruf geschnitten wie das Bild — die Label-Region
   ist per Konstruktion die Crop-Region, Mesh und Pads eingeschlossen.

Verpasste Hände kosten nichts, erfundene Flächen kosten das Training (User, 2026-08-18). Deshalb
Konsens statt Union: die Union aus Score und SAM 2 hatte die beste Trefferzahl (186) und war
trotzdem die schlechteste Wahl — sie erbt jede Falschflagge beider Seiten.
