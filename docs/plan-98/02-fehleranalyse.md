# 02 — Fehleranalyse: wo die fehlenden Prozentpunkte sitzen

> Stand 2026-09-11. Alle Zahlen aus eigenen Messungen auf dem gepinnten Split
> (`data/datasets/real13-mix-v6-{80,128}/split-pin.json`). Kein Training gestartet;
> gerechnet wurden fünf Vorwärtsläufe auf Val/Test.

## 0. Kurzfassung

1. **Kein Label-Rauschen gefunden.** Jede inspizierte Fehlerzelle des besten Modells trägt das
   richtige Label. Der Korpus setzt die Obergrenze *nicht*.
2. **68 % aller Restfehler kommen aus 12 von 280 Verweil-Episoden** — einzelne physische
   Figurenaufstellungen, nicht eine breite Klassenschwäche.
3. **Eine einzige Episode entscheidet den Val-Wert.** Ein weißer Springer, der auf `d5` sechs
   Halbzüge stehenbleibt, kostet 52 der 84 Val-Fehler. Ohne ihn steht der Lauf bei 0,9965.
4. **Der Treiber ist die Blickrichtung der Figur**, nicht Helligkeit, nicht Feldfarbe, nicht
   Verdeckung: zeigt der Springerkopf von der Kamera weg, wird die Draufsicht ein runder Klotz und
   liest sich als Turm.
5. **99 % ist erreichbar, aber der Val-Satz kann es nicht belegen.** Er trägt 876 unabhängige
   Entscheidungen; ein Unterschied von 1 pp sind 9 davon. Die Seed-Streuung allein ist größer.

## 1. Was die Metrik wirklich zählt

`val_visible_piece_acc` = korrekt / sichtbare, *tatsächlich belegte* Zellen
(`src/chesslab/training/data.py:137`, `piece_acc`). Leere Felder gehen nie ein — Phantome sind
darin unsichtbar.

Der Val-Satz ist **eine Aufnahme**, `rg-2026-09-06-20-27-33` (`split-pin.json`, `splits.val`).

| Größe | Wert | Quelle |
| --- | --- | --- |
| Val-Zellen gesamt | 33 511 | `manifest.jsonl`, Session gefiltert |
| davon sichtbar (`coverage <= 0,15`) | 31 342 (93,5 %) | s. o. |
| sichtbare Figurenzellen | **11 684** | deckt sich mit `CLAUDE.md` |
| nach dem Brettschnitt (nur volle 64er-Bretter) | 24 896 Zeilen -> **9 028** Figurenzellen | `PackedBoardDataset` |
| **Halbzüge (Plies) im Val** | **37** | 4–16 Frames je Ply |
| **unabhängige (Ply, Feld)-Entscheidungen** | **876** | eigene Auszählung |

Das ist der wichtigste Satz des Dokuments: **die 9 028 Zellen sind 876 Entscheidungen.** Ein Frame
ist keine unabhängige Ziehung — die Figur wird zwischen zwei Zügen nicht angefasst. Wer auf
Zellen rechnet, überschätzt die Auflösung der Metrik um den Faktor ~10.

Auf Slot-Ebene (Mehrheitsvotum je Ply/Feld):

| Lauf | Zell-acc | Slot-acc | falsche Slots von 876 |
| --- | --- | --- | --- |
| `_arch80v6/p4a-s42` | 0,9627 | 0,9669 | 29 |
| `_arch128v6-frac1/p4a-s42` | **0,9907** | **0,9909** | **8** |

> **Zur Zahl 0,9548 aus dem Auftrag:** in `data/models/_arch80v6/p4a-s42/metrics.jsonl` steht sie
> nicht. Dort ist die letzte Epoche 0,9627 und `best` ebenfalls 0,9627 (Epoche 60/60); der
> Mittelwert der letzten 10 Epochen ist 0,9576. Mein Eval von `best.pt` reproduziert 0,9627.
> **0,9548 ist unbelegt.**

## 2. Die Fehlerquellen, nach Ertrag sortiert

Basis: `_arch128v6-frac1/p4a-s42`, Val **und** Test zusammen (32 323 sichtbare Figurenzellen,
497 Fehler, acc 0,9846). Val allein ist zu klein, um Quellen zu trennen.

| # | Quelle | Fehler | Anteil | acc danach | Ursache | Was hilft |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **`e2` wN, Test 00-39-57, Plies 13–41** | 253 | 50,9 % | 0,9924 | Springerkopf zeigt von der Kamera weg -> runde Silhouette, gelesen als `wR` (Plies 13–25) bzw. `wB` (27–41) | Ausrichtungs-Abdeckung im Training |
| 2 | **`d5` wN, Val 20-27-33, Plies 33–38** | 52 | 10,5 % | 0,9940 | dieselbe Ansicht, conf 0,99 -> `wR` | dito |
| 3 | **Streufehler in 45 Episoden** | 158 | 31,8 % | 0,9989 | transient: Teilverdeckung knapp unter der Schwelle, Bewegung. conf-Median **0,697** (korrekte Zellen 1,000); `coverage > 0,05` bei 7,0 % gegen 0,8 % | zeitliche Mehrheit auf dem Gerät; per Konfidenz verwerfbar |
| 4 | 10 kleine Episoden >= 80 % falsch (`d7` bR, `d8` bN, `c7` bB …) | 82 | 16,5 % | — | Einzelfälle, je 1–16 Zellen | Restrauschen |

Die Bänder überlappen nicht: 0 + 158 + 257 + 82 = 497. Quelle 1 und 2 liegen zusammen im Band
20–80 % (257 Fehler), Quelle 4 im Band >= 80 %.

### Die Episoden-Verteilung ist der eigentliche Befund

Eine *Verweil-Episode* = zusammenhängender Ply-Lauf einer Figur auf einem Feld. Solange sie steht,
ist ihre Ausrichtung konstant — die Frames sind Wiederholungen derselben Ansicht.

| Fehlerrate der Episode | Episoden | Zellen | Fehler | Anteil |
| --- | --- | --- | --- | --- |
| 0 % | 223 | 24 438 | 0 | 0 % |
| < 20 % | 45 | 7 441 | 158 | 31,8 % |
| 20–80 % | **2** | 358 | **257** | **51,7 %** |
| >= 80 % | 10 | 86 | 82 | 16,5 % |

**223 von 280 Episoden sind fehlerfrei.** Zwei Episoden tragen die Hälfte aller Fehler. Das ist
kein Modell, das eine Klasse nicht kann — das ist ein Modell, das an zwölf konkreten Aufstellungen
scheitert.

## 3. Klassen und Bedingungen

Val + Test, 32 323 sichtbare Figurenzellen, je Feldfarbe:

| Klasse | n | 80 px acc | 128 px acc | 128 px hell | 128 px dunkel |
| --- | --- | --- | --- | --- | --- |
| **wN** | 2 203 | 0,6709 | **0,8529** | **0,6852** | 0,9901 |
| bN | 1 337 | 0,8983 | 0,9925 | 0,9948 | 0,9916 |
| wB | 1 029 | 0,8639 | 0,9786 | 0,9778 | 0,9797 |
| bB | 1 885 | 0,6414 | 0,9947 | 0,9957 | 0,9937 |
| wR | 2 244 | 0,9461 | 0,9871 | 0,9945 | 0,9801 |
| bR | 2 362 | 0,9445 | 0,9903 | 0,9865 | 0,9932 |
| wP | 8 227 | 0,9928 | 0,9974 | 0,9974 | 0,9975 |
| bP | 8 503 | 0,9895 | 0,9946 | 0,9972 | 0,9908 |
| wQ | 988 | 0,9960 | 0,9970 | 0,9966 | 1,0000 |
| bQ | 1 074 | 1,0000 | 1,0000 | 1,0000 | 1,0000 |
| wK | 1 168 | 0,9717 | 0,9932 | 0,9800 | 0,9977 |
| bK | 1 303 | 0,9992 | 0,9992 | 1,0000 | 0,9959 |

Bei 128 px liegt **jede Klasse über 0,978 — außer `wN`**.

### Es ist nicht „wN auf hellem Feld", es sind zwei Felder

| Feld | Farbe | n | falsch | acc |
| --- | --- | --- | --- | --- |
| **e2** | hell | 340 | **253** | 0,256 |
| **d5** | hell | 77 | **53** | 0,312 |
| b1 | hell | 333 | 3 | 0,991 |
| f3 | hell | 65 | 0 | 1,000 |
| e6 | hell | 53 | 0 | 1,000 |
| e4 | hell | 52 | 1 | 0,981 |
| b5 | hell | 51 | 0 | 1,000 |
| c3 | dunkel | 676 | 1 | 0,999 |

306 der 312 `wN`-Hell-Fehler liegen auf `e2` und `d5`. Die übrigen hellen Felder tragen zusammen
6 Fehler auf 554 Zellen. **Feldfarbe ist die Korrelation, nicht die Ursache.**

### Helligkeit ist ebenfalls nicht die Ursache

`wN` auf hellem Feld nach Helligkeitsband: 0–110 -> 0,700 · 110–130 -> 0,674 · 130–145 -> 0,552 ·
145–160 -> 0,634 · **160+ -> 0,941**. Das hellste Band ist das beste. Über alle Figuren bei 128 px:
0–60 -> 0,9886, 60–120 -> 0,992–0,995, 120–150 -> 0,9785, 150+ -> 0,9607 — eine schwache Neigung
nach hell, die vollständig von `e2`/`d5` erzeugt wird.

**Die dunkle Ecke ist bei 128 px kein Problem.** Der Befund in `CLAUDE.md` betrifft das
Settle-Gate, nicht den Klassifikator — nicht verwechseln.

### Verdeckung

Belegungsfehler sind praktisch weg: `val_visible_occupied_acc` liegt bei allen brauchbaren Läufen
bei 0,9993–0,9996 (`metrics.jsonl`). Bei 128 px auf Val: **2 Phantome, 9 Misses** von 23 955
sichtbaren Zellen. Die Streufehler (Quelle 3) sind aber 9x mit `coverage > 0,05` angereichert —
also Zellen knapp *unter* der Maskierungsschwelle. Dort sitzt der transiente Rest.

## 4. 80 px gegen 128 px — was Auflösung löst und was bleibt

Mehr Auflösung räumt **ganze Fehlerarten** ab:

- `bB` 0,6414 -> 0,9947 (dunkle Felder 0,5222 -> 0,9937)
- `bN` 0,8983 -> 0,9925, `wB` 0,8639 -> 0,9786, `wK` hell 0,8967 -> 0,9800
- `wR`/`bR` ca. 0,945 -> ca. 0,989

Was **bleibt**: `wN` — und dort ausschließlich die zwei Ansichts-Episoden. Bei 80 px kommt dieselbe
Krankheit hinzu, nur auf anderen Feldern (`f4` 218/218 falsch -> `wP` bei conf 1,000; `f5` 19/19).
Bei 128 px ist `f4` fehlerfrei, dafür fällt `d5`.

**Das ist die Pointe:** die beiden Modelle scheitern an *verschiedenen* Episoden und sind auf der
jeweils anderen perfekt. Auflösung verschiebt, welche Ansicht kippt; sie beseitigt die Anfälligkeit
nicht.

Gegenprobe mit dem kopflosen Modell auf **identischen Zeilen** (`p4n-s42` gegen `p4a-s42`, 128 px,
Val):

| | acc | Top-Fehlerfelder | Phantome (sichtbar) |
| --- | --- | --- | --- |
| `p4a` (Brettkopf) | 0,9907 | d5 52, d8 9, e3 8 | **2** |
| `p4n` (ohne Kopf) | 0,9920 | **e3 33**, d5 15, d1 4 | **20** |

Auf `d5` liegt `p4n` 37 von 52 richtig, kippt dafür auf `e3`. Gleiche Genauigkeit, andere Episode,
**10x so viele Phantome** — nach `phantoms-are-the-veto` bleibt `p4a` der bessere Lauf, obwohl
`visible_piece_acc` das Gegenteil nahelegt (bekannt aus `docs/agent-briefs/aufloesung-96.md`).

## 5. Der Mechanismus, visuell belegt

Kontaktbögen aus den Crop-Dateien des Manifests, abgelegt in `docs/plan-98/proben/`
(`probe_d5.png`, `probe_80err.png`, `probe_wn_light.png`, `probe_e2_vs_ok.png`):

- Auf `d5` (Plies 33–38) steht **sichtbar ein Springer**. Das Label `wN` ist richtig.
- Auf `e2` und `d5` zeigt der Kopf von der Kamera weg: man sieht Hinterkopf und Mähne als
  geschlossene, runde Masse — genau die Draufsicht eines Turms.
- Auf `b1`, `f3`, `e6` (alle hell, alle fehlerfrei) zeigt der Kopf zur Seite: Schnauze und Auge
  bilden den charakteristischen Haken.
- Bei 80 px auf `f4`: ebenfalls ein klar erkennbarer Springer, vom Modell mit conf 1,000 als
  Bauer gelesen.

**Trainingsabdeckung** (nur reale Sessions, sichtbar; die `comp-*`-Zeilen tragen kein
`brightness`-Feld und sind hier nicht enthalten):

| Klasse/Feldfarbe | Zellen | unabhängige Slots |
| --- | --- | --- |
| wP / hell | 16 664 | 1 699 |
| wR / hell | 4 571 | 546 |
| wB / hell | 4 247 | 555 |
| **wN / hell** | **3 076** | **376** |

`wN` auf hellem Feld hat 4,5x weniger unabhängige Aufstellungen als `wP` — und der Springer ist die
Figur, deren Draufsicht am stärksten von der Ausrichtung abhängt. Wie viele dieser 376 Slots die
Ansicht „Kopf weg" zeigen, ist **nicht gemessen** (das Manifest trägt keine Ausrichtung).

Die Läufe fahren **ohne** Rotations- oder Spiegel-Augmentierung: `aug_rot90 = False`,
`aug_rot180_p = 0.0`, `aug_hflip_p = 0.0`, `aug_vflip_p = 0.0` (`config.json` beider Läufe). CLAHE
ist ebenfalls nicht gebacken (`data/datasets/real13-mix-v6-128/packed_meta.json`: `"baked": null`) —
der Champion aus dem Gedächtnis (`p4a-80-clahe`) hatte es.

## 6. Wenn man die drei größten Quellen schließt — wo landet man?

Ausgangspunkt `_arch128v6-frac1/p4a-s42`, Val + Test, 32 323 Zellen, 497 Fehler = **0,9846**.

| Schritt | Fehler danach | acc |
| --- | --- | --- |
| Ausgang | 497 | 0,9846 |
| + `e2`-Episode gelöst | 244 | **0,9924** |
| + `d5`-Episode gelöst | 192 | **0,9940** |
| + Streufehler halbiert (zeitliche Mehrheit) | 113 | **0,9965** |
| + alle 10 Kleinepisoden | 31 | 0,9990 |

Nur auf **Val** (9 028 Zellen, 84 Fehler, 0,9907), weil der Nutzer diese Zahl verfolgt:

| Schritt | Fehler | `val_visible_piece_acc` |
| --- | --- | --- |
| Ausgang | 84 | 0,9907 |
| **nur die `d5`-Episode gelöst** | 32 | **0,9965** |
| + Streufehler halbiert | ca. 22 | 0,9976 |

**Eine einzige Figurenaufstellung trennt 0,9907 von 0,9965.**

## 7. Ist 99 % mit diesem Korpus erreichbar?

**Ja — die Obergrenze setzt nicht das Label-Rauschen.** Beleg: ich habe die überzeugt-falschen
Zellen des besten Modells visuell geprüft (die 52 `d5`-Zellen, Stichproben aus den 253 `e2`-Zellen,
die 218 `f4`-Zellen des 80-px-Laufs). **Alle tragen das richtige Label.** Es wurde kein einziger
Labelfehler gefunden. Der Korpus ist an dieser Stelle sauber.

**Aber der Val-Satz kann 99 % nicht belegen.** Drei Gründe:

1. **Auflösung der Metrik.** 876 unabhängige Entscheidungen. 1 pp = 9 Entscheidungen. Der
   Stichprobenfehler auf 8 Fehlern ist ±2,8 (Wurzel aus 8), also ±0,32 pp. 0,990 und 0,993 sind auf
   diesem Val nicht unterscheidbar.
2. **Seed-Streuung.** `CLAUDE.md` nennt 0,0157 — auf Val sind das 142 Zellen, fast drei
   `d5`-Episoden. Die Streuung ist größer als alles außer der dominanten Episode.
3. **Eine Aufnahme.** Val enthält *eine* Session. Auf dem Test-Split gemessen (derselbe Lauf,
   128 px):

   | Aufnahme | Zellen | acc | Slots | falsche Slots |
   | --- | --- | --- | --- | --- |
   | `rg-2026-09-06-20-27-33` (Val) | 9 028 | 0,9907 | 876 | 8 |
   | `rg-2026-08-08-00-39-57` | 18 572 | **0,9784** | 1 738 | 39 |
   | `rg-2026-08-08-11-55-19` | 4 723 | **0,9975** | 487 | **0** |

   Dieselbe Gewichtsdatei liegt je nach Aufnahme zwischen 0,978 und 1,000. **Der Val-Wert 0,9907
   ist keine Eigenschaft des Modells, sondern eine Eigenschaft der Aufnahme.** Genau der
   Glücksgriff, den der Nutzer ausschließen will.

### Was „robust über 99 %" konkret verlangt

- **Das Ziel muss über mehrere Aufnahmen gelten**, nicht über den Val-Mittelwert. Belastbar wäre:
  *jede* gehaltene Aufnahme >= 0,99 auf Slot-Ebene. Heute schafft das eine von drei.
- **Auf Slots berichten, nicht auf Zellen** — sonst zählt eine lange Verweildauer als viele Belege.
- **Episoden zählen.** Ein Lauf mit 8 falschen Slots aus 2 Episoden ist etwas anderes als einer mit
  8 falschen Slots aus 8 Episoden. Ersteres ist ein Ansichtsproblem, letzteres Rauschen.
- **`visible_piece_acc` darf nicht auswählen** (leere Felder gehen nie ein): `p4n` sieht darauf
  besser aus als `p4a` und hat 10x so viele Phantome. Phantomzahl daneben stellen.

## 8. Offene Punkte (nicht gemessen)

- Ob die Ausrichtung der Figur die Ursache ist, ist **visuell** belegt, nicht numerisch — das
  Manifest trägt keinen Gierwinkel. Eine Zählung „Ansicht Kopf-weg" über den Trainingskorpus
  existiert nicht.
- Ob Rotations-Augmentierung der Crops die 3D-Gier der Figur brauchbar nachahmt, ist bei einer
  nahezu senkrechten Kamera plausibel, aber **ungemessen** — und sie dreht auch Rillen und
  Lichtgradient mit.
- CLAHE ist in `v6` nicht gebacken; der Effekt auf `wN` ist ungemessen.
- Nur ein Seed je Arm ausgewertet. `_arch128v6-frac1/p4a-s43` brach nach 14 Epochen ab.

## Anhang: was gerechnet wurde

`chesslab eval --run data/models/_arch80v6/p4a-s42 --split val` (schreibt `confusion_val.txt` und
`eval_val.json`) sowie fünf Zeilen-Dumps über `evaluate_dataset` (je ein Vorwärtslauf):
`p4a@80` Val + Test, `p4a@128` Val + Test, `p4n@128` Val. Kein Training, keine Lauf-Verzeichnisse
verändert außer den beiden von `eval` selbst geschriebenen Dateien in `_arch80v6/p4a-s42/`.
