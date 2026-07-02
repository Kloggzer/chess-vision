# chesslab — Session-Report (Preprocessing-System, Sweep-Aufnahme, erster Bake-Off)

> Stand: 2026-06-30. Dieser Report fasst zusammen, was in dieser Session gebaut/gefixt wurde, die
> Ergebnisse des ersten Geometrie×Photometrie×Kopf-Bake-Offs, und die nächsten sinnvollen Schritte.

---

## TL;DR

- Die komplette Preprocessing- und Aufnahme-Pipeline wurde überarbeitet und **funktioniert
  end-to-end** auf echten Handy-Cam-Daten (3072×4096, scharf).
- Der **erste Bake-Off** (16 Varianten, 30 Epochen) lief sauber durch. **Wichtig:** mit nur **2
  Sessions** und **identischer Linien-Aufstellung** ist die Datenlage zu dünn — die Headline-Metrik
  **Board-Accuracy ist bei allen Varianten 0** (alle 64 Felder eines Boards exakt richtig ist hier
  zu hart). Das Ranking läuft daher über **macro-F1** und ist ein **Richtungssignal**, kein Beweis.
- **Befunde (vorläufig):**
  1. **warp > box3d** — deine Kamera steht ~senkrecht (near-overhead), da bringt die 3D-Box nichts
     und ist eher unschärfer/lockerer. Erwartet.
  2. **Kombinierter Kopf > faktorisierter Kopf** — durchweg. Der entkoppelte Typ+Farbe-Kopf hat hier
     **nicht** geholfen (siehe Diskussion unten).
  3. **Photometrie-Effekt klein:** `clahe` minimal vorn, `none`/`gamma` praktisch gleichauf,
     `grayworld` am schwächsten.
- **Nächster großer Hebel: mehr & variantenreichere Daten** (≥3 Sessions, vor allem **andere
  Figuren-auf-Linie-Aufstellungen**), damit Board-Accuracy > 0 wird und ein echter Test-Fold möglich ist.

---

## Zweistufiger Occupancy→Piece-Kopf (neu, Recherche-Best-Practice)

Aus der Deep-Research (chesscog/Wölflein & Bringmann, ChessReD, LiveChess2FEN): der größte Hebel für
Board-Accuracy bei wenig Daten ist eine **zweistufige Architektur** — erst Occupancy (leer/besetzt,
sehr leicht), dann Figur nur auf besetzten Feldern. Umgesetzt als neuer **Kopf `twostage`**
(`HierarchicalHead`, geteiltes Backbone + Occupancy-Kopf[2] + Figuren-Kopf[13]). Trick wie beim
faktorisierten Kopf: die Ausgabe sind **rekonstruierte 14-Klassen-Log-Probs**, daher bleibt **alles
Nachgelagerte (Dataset, Manifest, board_acc, Eval, Inferenz, FEN) unverändert** — `CrossEntropyLoss`
darauf ist exakt die zweistufige Joint-NLL, der Figuren-Kopf bekommt **automatisch nur auf besetzten
Feldern Gradient** (kein Loss-Sonderfall im Trainingsloop). Wählbar via `train --head twostage`,
Web-Training-Dropdown und `experiment run --heads …,twostage`; Default bleibt `combined`.

**Neue Diagnose** (kopf-unabhängig, in `eval` + Bake-Off-Tabelle): `occ_acc`, `occ_board_acc`,
`piece_acc`, `type_err`, `color_err` — zeigt, WO die Fehler sitzen (Occupancy vs. Typ vs. Farbe).

**Erster fairer 3-Kopf-Vergleich** (warp/none, 30 Epochen, Eval=val, 2 Sessions):

| head | macro_f1 | occ_acc | piece_acc | type_err | color_err |
|---|---|---|---|---|---|
| combined | **0.420** | 0.783 | 0.477 | 0.516 | 0.008 |
| twostage | 0.339 | **0.914** | 0.406 | 0.555 | 0.039 |
| factored | 0.250 | 0.768 | 0.344 | 0.594 | 0.063 |

- **twostage gewinnt die Occupancy klar (0.914 vs 0.78)** — genau die Recherche-Prämisse. Auf den
  dünnen 2 Sessions schlägt der kombinierte Kopf insgesamt (macro_f1) aber noch leicht.
- **Der Engpass ist überall der TYP-Fehler (~0.52–0.59), nicht die Farbe (~0.01–0.06)** und nicht die
  Occupancy. Das ist das konkrete nächste Ziel. board_acc bleibt 0 (Daten zu dünn — s. u.).
- Belastbarer Kopf-Vergleich erst mit ≥3 Sessions/anderen Aufstellungen (`--eval-split test`).

## Bake-Off-Ergebnisse

**Lauf:** `chesslab experiment run --sessions 20260630-010216,20260630-014453 --geometries warp,box3d
--photometries none,clahe,grayworld,gamma --heads combined,factored --eval-split val --epochs 30`
(16 Varianten, smallcnn, board_size 1600). Roh: `data/experiments/bakeoff/comparison.md` (+ `.csv`,
`variants.json`).

**Split:** Train = `20260630-014453` (all-Sweep, **mit Bauern**), Val = `20260630-010216`
(special-Sweep). Kein Test-Fold (nur 2 Sessions). Eval auf **Val**.

Sortiert nach **macro-F1** (Board-Acc ist überall 0):

| # | Variante | Geometrie | Photometrie | Kopf | macro-F1 |
|---|---|---|---|---|---|
| 1 | warp-clahe-combined | warp | clahe | kombiniert | **0.441** |
| 2 | warp-none-combined | warp | none | kombiniert | 0.431 |
| 3 | warp-gamma-combined | warp | gamma | kombiniert | 0.424 |
| 4 | box3d-none-combined | box3d | none | kombiniert | 0.375 |
| 5 | warp-grayworld-combined | warp | grayworld | kombiniert | 0.359 |
| 6 | box3d-grayworld-combined | box3d | grayworld | kombiniert | 0.340 |
| 7 | box3d-gamma-combined | box3d | gamma | kombiniert | 0.323 |
| 8 | warp-gamma-**factored** | warp | gamma | faktorisiert | 0.299 |
| … | … (restliche faktorisierte + box3d-clahe) | | | | 0.17–0.28 |

(Vollständige Tabelle inkl. Per-Klassen-Recall in `comparison.md`.)

### Interpretation

- **warp schlägt box3d:** Die besten 3 sind alle `warp`. box3d (3D-Box aus dem Originalframe) ist für
  **schräge** Kameras gedacht; deine steht annähernd senkrecht → kaum Parallaxe, und die Box zieht
  mehr Kontext/Unschärfe rein. Für dieses Setup ist der geborderte warp-Crop (5% Pad, board_size 1600)
  die richtige Wahl. box3d bleibt als Option für schräge Kameras im Code.
- **Kombiniert > faktorisiert (klar):** Alle 7 obersten Plätze sind `combined`; die faktorisierten
  Köpfe landen durchweg darunter. Die erhoffte Pooling-Wirkung (Typ-Kopf lernt P aus weiß+schwarz)
  hat sich **nicht** ausgezahlt. Wahrscheinliche Gründe: bei sehr wenig Daten + 30 Epochen lernt der
  direkte 14-Klassen-Kopf schneller/stabiler; der zusätzlich gekoppelte Farb-Kopf scheint hier eher
  zu unterfitten. **Nicht verwerfen** — der faktorisierte Kopf ist sauber implementiert und sollte
  mit mehr Daten / mehr Epochen erneut gegen den kombinierten antreten, bevor man ihn beerdigt.
- **Photometrie:** `clahe` (0.441) ≈ `none` (0.431) ≈ `gamma` (0.424) — der Unterschied ist im
  Rauschen dieser dünnen Daten. `grayworld` ist konsistent schwächer. Vorerst: **keine Photometrie
  oder CLAHE**; grayworld nicht.

### Ehrliche Einordnung (Limitierungen)

- **Board-Accuracy = 0 überall** → die eigentliche Zielmetrik liefert noch **kein** Signal. Ursache:
  zu wenig/zu gleichförmige Daten.
- **Nur 2 Sessions, gleiche Aufstellung:** jede Figur stand nur auf **einer** Linie (a=König, b=Dame,
  …). Das Modell kann „Linie ⇒ Figur" auswendig lernen (Positions-Overfitting); Val (gleiche
  Aufstellung) deckt das nicht auf. Die Per-Klassen-Recalls sind zudem auf **8 Beispiele/Figur**
  geschätzt → sehr verrauscht.
- **Kein Test-Fold** (2 Sessions). Eval auf Val.
- → Die Reihenfolge ist ein **Richtungssignal** (warp>box3d, combined>factored, grayworld schwach),
  keine belastbare Aussage über die absolute Güte.

---

## Was diese Session gebaut/gefixt wurde

**Preprocessing & Geometrie**
- `geometry3d.py` (neu): **box3d**-Crop — Kamerapose pro Frame (solvePnP/IPPE aus den ArUco-Markern),
  pro Feld eine 3D-Box in den scharfen Originalframe projiziert.
- **MarkerTracker-Snap-Fix:** ein geseedeter Marker wird bei der ersten Detektion *gesnappt* statt
  EMA-geblendet — vorher entstand ein versetztes Raster im Marker-Fallback.
- **Geborderter Daten-Crop:** der Warp für die Crops wird mit Rand entzerrt, damit **Randfelder**
  echten Brettinhalt für die Pad-Erweiterung haben (statt schwarzem Rand). Anzeige bleibt
  edge-to-edge. `pad_side` ist symmetrisch in alle 4 Richtungen (Default 5%).
- **board_size 800 → 1600:** an die hochauflösende Quelle angepasst — vorher wurde auf 100 px/Feld
  runtergewarpt und wieder hochskaliert (pixelig); jetzt ~200 px/Feld → scharfe 128er-Crops.

**Photometrie**
- `photometric.py` (neu): geteilter, deterministischer Filter (`none/clahe/grayworld/gamma`),
  identisch in Slicing **und** späterer Live-Inferenz.

**Aufnahme (Sweep)**
- Neue `sweep`-Strategie: eine Figurenreihe **wandert Rang für Rang** übers Brett (je eine Figur pro
  Linie). Modi `special/pawn/all`; `all` = Specials + Bauern als **Block** (benachbarte Ränge),
  **beide Farben gleichzeitig** → 8 Fotos decken alles ab.
- **Label-Bug gefixt:** die ursprüngliche Pass-Rotation verschob die Linien→Figur-Zuordnung mitten in
  der Session (a-Linie wurde plötzlich „Dame") — dadurch landeten Königs-Crops im Damen-Ordner.
  Rotation **entfernt**; jede Figur bleibt auf ihrer Linie. Session `014453` wurde **nachträglich
  korrigiert** (FENs der Wiederholungs-Frames repariert, neu gesliced).

**Multi-Cam / Web-UI**
- **IP-Cam-Hybrid:** `--source` (flüssiger MJPEG-Stream als Vorschau) + `--capture-source`
  (hochauflösender Snapshot fürs Speichern; Ecken werden auf dem Snapshot neu erkannt). URL-fähiges
  `open_camera`. Live-Inferenz nutzt exakt den Trainings-Crop (`crops_for_frame`).
- Beschriftetes **Live-Kalibrier-Grid** (a1–h8), **dataset-aware Crop-Browser** (zeigt die Crops des
  gewählten Datensatzes statt nur den globalen Pool).

**Bake-Off**
- `experiment.py` (neu): Runner über Geometrie×Photometrie×**Kopf**. Crops/Datensätze hängen nur an
  Geometrie×Photometrie (8 Datensätze), Modelle an Geometrie×Photometrie×Kopf (16 Runs). Faire,
  identische Splits; Metriken Board-Acc + macro-F1 + Per-Klassen-Recall + Kamera-Spread.
- `experiment.py`/CLI: `--heads combined,factored`, `--eval-split val`, robuster 2-Session-Split
  (vollständigste Session wird in Train gezwungen, damit Val keine ungesehenen Klassen hat).

**Modell**
- `training/model.py`: **faktorisierter Kopf** (`FactoredHead` + `DecoupledModel`) — Typ-Kopf (8) +
  Farb-Kopf (2), additiv zu 14 Logits (`logit_wP = typ[P] + farbe[w]`). Gibt 14 Logits aus → Eval/
  Board-Acc/Inferenz unverändert. Wählbar über `build_model(head=…)` / `train --head` / Bake-Off.

**Tests:** 89 grün (neu: Sweep-Coverage, Pad-Symmetrie, Snap-Fix, all-Block, Split).

---

## Aktueller Datenstand

- **Aktive Sessions** (`data/sessions/`): `20260630-010216` (special-Sweep, 8 Fotos),
  `20260630-014453` (all-Sweep, 16 Fotos, **korrigiert**), plus ein 1-Frame-Manual-Test und eine
  Inferenz-Test-Session.
- **Datensatz `s4`** = beide korrigierten Sweep-Sessions (board_size 1600), neu gebaut.
- **Alt-Daten** (7 `default`-USB-Cam-Sessions) liegen archiviert in `data/sessions_archive/`.
- Profile `default`/`phone` auf board_size 1600. (Alle `data/` ist git-ignored.)

---

## Empfohlene nächste Schritte

1. **Mehr Sessions, andere Aufstellungen** — der mit Abstand wichtigste Hebel. Nimm 2–4 weitere
   Sweep-Sessions auf, aber stelle die Figuren je Session in **anderer Linien-Reihenfolge** auf (z. B.
   Standard-Grundreihe R,N,B,Q,K,B,N,R, dann eine zufällige). Damit sieht jede Figur **viele
   verschiedene Felder/Linien** → kein Positions-Overfitting, Board-Accuracy wird aussagekräftig, und
   ein echter **Test-Fold** (≥3 Sessions) wird möglich.
2. **Licht variieren** zwischen Sessions (eigene „Kamera"-Achse für Robustheit).
3. **Bake-Off erneut** mit den größeren Daten (`--eval-split test`, sobald ≥3 Sessions). Erst dann ist
   die Frage „kombiniert vs. faktorisiert" und „warp vs. box3d" belastbar zu beantworten.
4. Optional: faktorisierten Kopf mit mehr Epochen / Klassengewichtung nachjustieren, bevor man ihn
   final bewertet.

---

## Reproduktion / nützliche Befehle

```bash
# Web-UI mit Handy-Cam (Vorschau-Stream + HiRes-Snapshot fürs Speichern)
uv run chesslab web --source https://<phone-ip>:4444/video/m.jpeg \
                    --capture-source https://<phone-ip>:4444/video/snapshot

# Sweep aufnehmen (CLI-Äquivalent zum Web-„Sammeln")
chesslab collect play --strategy sweep --pieces all --together --profile phone

# Bake-Off
chesslab experiment run --sessions <id1>,<id2>,<id3> \
  --geometries warp,box3d --photometries none,clahe,grayworld,gamma \
  --heads combined,factored --eval-split val --epochs 30
# Tabelle aus bestehenden Runs neu schreiben (ohne Re-Training):
chesslab experiment table --sessions <ids> --heads combined,factored --eval-split val
chesslab experiment list  --heads combined,factored      # Status je Variante
```

---

## Externe Datensätze ingestieren → Pretrain → Finetune (neu, Weg A)

Gegen den Typ-Engpass: Transfer-Learning. Neuer Befehl **`chesslab ingest <chesscog|chessred> <pfad>`**
überführt fremde Voll-Brett-Datensätze (Fotos mit bekannten Ecken + FEN) in unser Per-Feld-Crop-Format
— **ohne jede Änderung an der Kern-Pipeline**: jedes Bild wird als **synthetische Session** geschrieben
(`session.yaml`/`log.jsonl` zeigt auf das Originalbild + seine 4 Ecken), dann läuft das bestehende
`slice → build_dataset`. Keine Marker, keine Intrinsics nötig (Warp aus den 4 Ecken).

- **Adapter:** `chesscog` (gerendert, ~5k, JSON pro Bild mit `corners`/`fen`/`white_turn` — exakt
  geparst inkl. 180°-Drehung bei Schwarz-unten) und `chessred` (ChessReD2K, ~2k echte Fotos, CC-BY-4.0;
  Figuren→FEN solide, **Eck-Schema gegen den Download final zu bestätigen**).
- **3-stufiges Curriculum:** chesscog → ChessReD2K (`--resume`) → eigene Sessions (`--resume`); gleiches
  Backbone + `--head twostage` → voller Warm-Start.
- **Sicherheitsnetz `--debug-overlay N`:** warpt N Frames + blendet FEN-Labels ein → Sichtprüfung gegen
  **stille Label-Vertauschung** (falsche Eck-Reihenfolge spiegelt alle Labels). VOR dem großen Pretrain.
- **Neue Dateien:** `src/chesslab/ingest.py`, `src/chesslab/ingest_adapters/{chesscog,chessred}.py`,
  `tests/test_ingest.py`. **Tests: 100 grün** (neu: 7 Ingest-Tests inkl. End-to-End Synthbild→Slice mit
  Orientierungs- und Label-Prüfung). Kern-Pipeline-Dateien **unverändert**, nur genutzt.

## 2026-07-02 — Occupancy-first Checkpoint + kamerarealistische Augmentierung

Checkpoint-Kriterium ab 2026-07-02: **occupancy-first** — best.pt wird nach
`(occ_board_acc, occ_acc, macro_recall)` gewählt statt nach `(macro_recall, board_acc)`.
**best.pt neuer Runs ist nicht mit Bake-off-Ära-Runs vergleichbar** (anderes Kriterium wählt
andere Epoche aus). Alte Metriken (`val_acc`, `val_macro_recall`, `val_board_acc`) werden
weiterhin geloggt; neu hinzugekommen: `val_occ_acc`, `val_occ_board_acc`, `val_piece_acc`.

Augmentierung auf realistischere Kamera-Varianz angehoben: `brightness=0.35`, `contrast=0.35`,
`gamma=(0.6, 1.8)`, `blur_sigma_max=1.5`. Rotation/Flip bleiben verboten.

## 2026-07-02 — Harte Split-Validierung

Split-Validierung ist ab jetzt hart: Eine Klasse, die im Gesamtbestand vorkommt, aber nur
in **einer** Session, führt zu einem Fehler (rc 1 / ValueError / HTTP 400) — ebenso ein
leerer Val- oder Test-Split. Alt-Datensätze sind degeneriert und brauchen
`--allow-degenerate` oder neue Sessions (zufällige Figur-Linien-Zuordnung). Die Escape-Hatch
(`--allow-degenerate`) ist in CLI (split/dataset build) und Web-API verfügbar;
`split.json` bekommt additiv das Feld `degenerate_errors`.

---
## Git-Stand

- Das **Preprocessing-System** (box3d, Photometrie, geborderter Crop, board_size, IP-Cam-Hybrid,
  Sweep, Crop-Browser) ist committet & gepusht: **`051ac48`** auf `main`.
- **Noch NICHT committet** (auf der Platte, getestet, 89 grün): der **faktorisierte Kopf** +
  **Bake-Off-Kopf-Achse** + **2-Session-Split-Fix** — also Änderungen in
  `training/model.py`, `training/train.py`, `training/evaluate.py`, `experiment.py`, `cli.py`,
  `dataset.py`, `dataset_build.py` (+ dieser `REPORT.md`). Ich habe **bewusst nicht committet**, da du
  fürs Pushen bisher immer explizit „commit and push" gesagt hast — sag einfach Bescheid, dann
  committe ich diesen Stand.
