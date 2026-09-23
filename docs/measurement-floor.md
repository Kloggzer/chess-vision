# Was dieses Messgeraet kann — und was es nur zu koennen vorgibt (2026-08-26)

`docs/seed-noise-floor.md` misst die Streuung ZWISCHEN Seeds. Hier steht, was innerhalb eines
Laufs passiert, und die Folgen sind groesser: zwei der Groessen, nach denen wir Modelle
ausgewaehlt haben, messen etwas anderes als gedacht.

Datenbasis: 23 abgeschlossene 60-Epochen-Laeufe in `data/models/_ab`, Achse
`val_visible_piece_acc`. Skripte in `tmp/screen/` (Wegwerf, die Zahlen stehen hier).

## 1. Die Rezepte sind nicht auskonvergiert

Der Mittelwert ueber alle Laeufe, je dritte Epoche:

| Epoche | 1 | 10 | 20 | 30 | 40 | 50 | 55 | 58 |
|---|---|---|---|---|---|---|---|---|
| Mittel | 0,550 | 0,604 | 0,636 | 0,653 | 0,671 | 0,690 | 0,699 | **0,700** |

Die Kurve steigt **bis zur letzten Epoche** — zwischen 43 und 58 noch um 0,020, also 1,3 Punkte
je zehn Epochen. Mit `--epochs 60 --sched cosine` endet der Lauf, wo er noch faellt, nicht wo er
flach ist.

**Folge:** jeder Armvergleich der Ausduenn-Studie vom 2026-08-25 und in `docs/occlusion-gate.md` wurde auf
unkonvergierten Modellen gefahren.

**Laenger trainieren hilft trotzdem nicht — im Gegenteil (nachgetragen 2026-08-26).** 120 Epochen
mit voller Cosine gegen 60, seed 42, gemessen auf dem geteilten Val: **0,7460 gegen 0,7585**, also
−0,0125. Die Ueberanpassungsluecke waechst dabei von 1,34 auf 1,58. `macro_recall` steigt
(0,5930 → 0,6248) und `occ_board` auch (0,8666 → 0,8784), die Figurenachse faellt.

Das ist kein Widerspruch zur steigenden Kurve oben: INNERHALB einer 60-Epochen-Cosine steigt sie
bis zum Schluss, aber eine 120-Epochen-Cosine ist ein anderer Lauf — sie verbringt mehr Zeit bei
hoher Lernrate und memoriert mehr. Die Kurve steigt, weil der Lauf noch laeuft, nicht weil noch
Generalisierung zu holen waere.

## 2. `best-by-score` meldet zwei Punkte, die es nicht gibt

Das Rauschen einer einzelnen Val-Messung, aus dem flachen Teil der Kurve (Differenz
aufeinanderfolgender Epochen, durch √2):

    sd = 0,0157

Ein Maximum ueber 60 solcher Ziehungen liegt im Mittel `sd·√(2·ln 60)` = **0,045** darueber. Real
gemessen (best minus Mittel der letzten fuenf) sind es **0,022** — weniger, weil die Kurve noch
steigt und das Maximum daher spaet und nah am Trend liegt.

Das ist keine Aufforderung, den Selektor zu wechseln: `best` streut zwischen Seeds mit 0,0158
WENIGER als jede Endwert-Variante (letzte Epoche 0,0212, Mittel der letzten fuenf 0,0225), weil ein
Maximum vieler Ziehungen eine glatte Funktion ist. Es ist eine Aufforderung, die Zahl nicht als
Guete zu lesen. Der Lauf ist rund zwei Punkte schlechter, als sein Checkpoint behauptet.

## 3. Kurze Laeufe sieben nicht

Die Rangfolge der neun Arme nach `n` Epochen gegen ihre Rangfolge nach 60:

| bis Epoche | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 |
|---|---|---|---|---|---|---|---|---|---|
| Spearman | 0,73 | **0,40** | 0,75 | 0,57 | 0,45 | 0,23 | 0,53 | 0,87 | 0,95 |

Nicht monoton — das ist kein Konvergieren, das ist Rauschen. Der spaetere Sieger stand nach 15
Epochen auf Rang 6, der damalige Erste fiel auf Rang 7. Verlaesslich wird es erst ab 45 Epochen,
und die kosten 22 von 31 Minuten. **Ein Screening ueber kurze Laeufe gibt es fuer diese Effekte
nicht.**

## 4. Was daraus folgt

- **Nur Eingriffe testen, von denen ein grosser Effekt zu erwarten ist.** Wer 0,005 sucht,
  braucht ein anderes Messgeraet, nicht mehr Seeds.
- **Gepaart bleibt der Hebel.** Bei identischem Seed und identischer Datenreihenfolge faellt die
  Streuung von 0,027 auf 0,003 (Korrektur der Ausduenn-Studie, 2026-08-26). Das gilt aber nur, solange
  wirklich alles ausser der Achse gleich ist: ein anderer Pack aendert die Reihenfolge der Batches
  und nimmt einen Teil des Gewinns mit.
- **Vor jedem Rezeptvergleich die Laenge klaeren.** Zwei Arme bei 60 Epochen zu vergleichen misst,
  wer nach 60 Epochen vorn ist — nicht, wer das bessere Rezept hat.
