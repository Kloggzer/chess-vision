# Training & Genauigkeit fürs Move-Tracking verbessern

Deep-Dive-Ergebnis: warum die bisherigen Modelle fürs Move-Tracking nicht reichen, und der
priorisierte Weg dahin. Kernbotschaft vorweg: **Die Occupancy-Erkennung (leer/besetzt) ist heute
schon die stärkste Fähigkeit der Modelle (0.78–0.91) — und genau die braucht der move_tracker.
Der Figurentyp ist der Flaschenhals (52–59 % Typ-Fehler), aber für Move-Tracking zweitrangig,
weil der Tracker die Figurenidentität aus dem Spielverlauf kennt.**

## 1. Ist-Zustand: Run-Ergebnisse

| Run | Datensatz | Train/Val | Backbone | Kopf | val_acc | macro_recall | board_acc |
|---|---|---|---|---|---|---|---|
| exp-warp-none-combined | bakeoff (2 Sessions!) | 704 / 512 | smallcnn | combined | 0.633 | 0.548 | 0.000 |
| exp-warp-clahe-combined | " | " | smallcnn | combined | 0.714 | 0.531 | 0.000 |
| exp-warp-*-factored (4×) | " | " | smallcnn | factored | 0.49–0.64 | 0.34–0.39 | 0.000 |
| exp-warp-none-twostage | " | " | smallcnn | twostage | 0.713 | 0.450 | 0.000 (occ_acc **0.914**) |
| run-20260626-155023 | S1 | 540 / 796 | mobilenet_v3s | combined | 0.658 | 0.475 | 0.186 |
| run-20260626-163320 | S2 | 4222 / 2324 | mobilenet_v3s | combined | **0.840** | 0.706 | 0.127 |
| run-20260630-091605 | s5 | 8684 / ? | smallcnn | combined | 0.825 | 0.693 | 0.000 |

Diagnose-Achsen (Bake-off): color_err 0.01–0.06 (Farbe ist gelöst), type_err 0.52–0.59
(Typ ist das Problem), occ_acc 0.78–0.91 (Occupancy fast gelöst, twostage am besten).

**Wichtig:** Die live beobachtete „Near-Random"-Performance der exp-warp-Modelle war (auch) ein
Serving-Problem, kein reines Trainingsproblem: `predict_arrays()` wendet keine Photometrie an —
ein clahe/gamma-Modell sieht in der Inference andere Bilder als im Training. → Issue C1 / R1.

## 2. Root Causes (nach Evidenz gerankt)

1. **Positions-Overfitting (kritisch).** In den Aufnahme-Sessions steht jede Figurenart immer auf
   derselben Linie; mehrere Klassen existieren nur in einer einzigen Session (split.json warnte
   12×, Test-Split leer). Das Modell kann „Linien-Index → Typ" lernen statt Figurenformen —
   val_acc überschätzt die echte Generalisierung, und auf neuen Stellungen bricht der Typ weg.
2. **Typ-Verwechslung als dominanter Fehlermodus.** Seltene Figuren (Q, K: 1–2 Exemplare pro
   Brett) haben zu wenige Beispiele; N↔B, R↔Q sind aus der Top-Down-Sicht ähnlich.
3. **Zu kleine Datensätze.** Bake-off: 1536 Crops = 24 Frames. Für 14 Klassen mit
   Klassenungleichgewicht schlicht zu wenig; s5 (8684) zeigt bereits den Sprung auf 0.83.
4. **board_acc ist als Metrik zu hart und zu varianzbehaftet.** 0.84 square_acc ⇒ erwartungsgemäß
   board_acc ≈ 0 bei unabhängigen Fehlern; die gemessenen 0.13–0.19 kommen aus korrelierten
   Fehlern (empty ≈ perfekt). Bei 8–70 Val-Frames ist die Metrik fast Rauschen — als
   Checkpoint-Kriterium ungeeignet.
5. **Augmentierung zu konservativ** für den echten Kamera-Alltag (Helligkeit ±0.2, blur σ≤0.8 —
   real: Schatten, Fokusdrift, Farbstiche).

## 3. Roadmap (priorisiert)

### P0 — Serving-Parität herstellen (Voraussetzung für alles)
`crops_for_model`-Facade bauen (recommendations.md R1): Geometrie **und** Photometrie aus der
Run-Config bei jeder Inference anwenden. Ohne das ist jede Modellverbesserung im move_tracker
unsichtbar. *Aufwand: 1 Tag. Effekt: Photometrie-Modelle werden überhaupt erst nutzbar.*

### P1 — Daten diversifizieren: zufällige Figur-auf-Linie-Zuordnung
Neue Sessions, in denen die Zuordnung Figur→Linie **pro Session zufällig** ist (Session A:
a=K, b=Q,…; Session B: a=R, b=P,…), plus mindestens eine Session mit echter Spielstellung und
verschiedenen Lichtsituationen (Tageslicht/LED/Schatten). Ziel ≥4 Sessions, ≥4000 Crops/Session.
Danach Split-Validierung hart machen (R5), damit das nicht wieder passiert.
*Effekt (geschätzt): board_acc 0.35–0.50, echter Typ-Fortschritt statt Linien-Memorisierung.*

### P2 — Occupancy-first für den move_tracker
Der Tracker braucht vom CNN primär „welches Feld wurde leer / nicht mehr leer" — Figurentyp kennt
er aus der Zughistorie. Konsequenzen:
- **twostage-Kopf als Default** (bester occ_acc 0.914 schon auf Mini-Daten) bzw. beim Konsumieren
  eines combined-Modells die 14 Klassen auf binär (empty/occluded vs. Rest) kollabieren — das ist
  deutlich robuster als die argmax-Klasse.
- **Checkpoint-Wahl auf Occupancy umstellen:** Early-Stopping-Score von `(macro_recall, board_acc)`
  auf `(occ_board_acc, occ_acc)` bzw. eine Mischung `0.7·occ_board_acc + 0.3·piece_acc`
  (training/train.py, Score-Tupel ~Zeile 192).
- Für Recovery-Zwecke Konfidenz nutzen: nur Felder mit hoher Occupancy-Konfidenz umentscheiden.
*Effekt: Die fürs Move-Tracking relevante Metrik (Occupancy-Board-Accuracy) ist schon heute nahe
brauchbar und wird direkt optimiert.*

### P3 — Vortraining nutzen (chesscog/ChessReD/synth)
Die Ingest-Pfade existieren bereits: erst auf pretrain-chesscog (+ ChessReD) vortrainieren, dann
mit niedriger LR (1e-4) auf den Live-Sessions finetunen. Die eigene Synth-Pipeline (Blender,
Top-Down, eigene Figuren) ist der langfristig beste Hebel gegen Datenmangel — dafür vorher
H5/R6 (reproduzierbare Pfade) und den Ecken-Reihenfolge-Test (C3/R2) umsetzen, sonst riskiert
man einen stillschweigend falsch gelabelten Synth-Datensatz.
*Effekt: schnellere Konvergenz, weniger Live-Sammelaufwand für gleiches Niveau.*

### P4 — Augmentierung an die Kamerarealität anpassen
Helligkeit/Kontrast ±0.35, Gamma 0.6–1.8, blur σ bis 1.5; Rotation/Flip bleiben verboten
(feste Kamera, Feldfarbe!). A/B auf s5 messen. (`config.py` AugmentPolicy, ~Zeile 130–149.)
*Effekt: +2–5 % val_acc unter Lichtvarianz, robustere Farbe.*

### P5 — Klassenbalance für seltene Typen
Q/K/N im Loss höher gewichten (3–5×) oder in Batches auf ~50 % der besetzten Felder oversamplen.
Erst nach P1 sinnvoll bewertbar (vorher misst man Linien-Memorisierung).

### P6 — Zurückgestellt
- **Factored-Kopf debuggen:** empirisch überall unterlegen; erst nach P1 mit >5k diversen Crops
  erneut antreten lassen, sonst verwerfen.
- **Größere Backbones:** mobilenet_v3_small reicht; das Problem sind Daten, nicht Kapazität.
- **board_acc „reparieren":** nicht nötig — als Reporting-Metrik behalten, als Steuerungsmetrik
  durch P2 ersetzt.

## 4. Erwartung, wenn P0–P4 umgesetzt sind

val_acc 0.88–0.95, board_acc 0.45–0.65 — und, entscheidend für den Tracker:
**Occupancy-Accuracy > 0.96 pro Feld**, also eine belastbare Basis für CNN-Recovery
(„welches Feld wurde wirklich leer / ist nicht mehr leer") und späteren Voll-Resync aus
beliebiger Stellung.

## 5. Direkter Bezug zum geplanten CNN-Recovery im move_tracker

Für das anstehende Feature („nur prüfen, welches Feld leer wurde / nicht mehr leer ist"):
1. P0 zuerst — sonst klassifiziert das Recovery auf falsch vorverarbeiteten Crops.
2. Modellwahl bis P1 abgeschlossen ist: run-20260626-163320 (val_acc 0.84, combined, S2) mit
   **binär kollabierten** Klassen verwenden; nicht die exp-warp-Photometrie-Modelle, solange
   P0 fehlt.
3. Recovery-Algorithmus: CNN-Occupancy-Bild vs. geglaubte Brett-Occupancy diffen; alle legalen
   Züge auf einer Board-Kopie anwenden und den Zug wählen, dessen resultierende Occupancy am
   besten zur CNN-Beobachtung passt (deckt Schlag, Rochade, en passant ab). Nur Felder mit hoher
   Konfidenz zählen lassen; bei Gleichstand keine Entscheidung (der bestehende
   Ambiguitäts-Mechanismus greift).
