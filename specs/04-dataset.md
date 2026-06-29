# Stufe 4 — Datensatz-Management (`dataset.py`)

## Zweck

Aus den gelabelten Crops einen trainierbaren Datensatz machen: Statistik, Klassenbalance,
**sessionbasierter** Split und eine klar definierte Augmentation-Policy. Diese Stufe ist
der Grund, warum das Modell später auch im Echtbetrieb funktioniert statt nur auf dem
Trainingsset gut auszusehen.

## CLI

```
chesslab stats   [--manifest data/manifests/squares.jsonl]
chesslab split   [--val-frac 0.15] [--test-frac 0.15] [--max-empty-ratio 1.5] [--seed 42]
chesslab dataset verify
```

## `stats` — Datensatz-Report

Aus dem Manifest aggregieren und ausgeben (Tabelle + optional `--json`):
- Anzahl Crops gesamt, Anzahl Sessions, Crops pro Session.
- **Verteilung pro Klasse** (alle 13). Hebt Unter-/Überrepräsentation hervor.
- Pro Figurenklasse: Abdeckung auf hellen vs. dunklen Feldern (`square_color`).
- Warnungen, wenn eine Nicht-`empty`-Klasse unter einem Schwellwert liegt
  (Default: < 200 Beispiele) oder eine Figur nur auf einer Feldfarbe vorkommt.

## Klassen-Ungleichgewicht (Pflicht-Behandlung)

`empty` dominiert massiv (über die halbe Zeit ist ein Feld leer). Zwei Hebel, beide
implementieren, Kombination konfigurierbar:

1. **`empty`-Subsampling beim Split:** `--max-empty-ratio R` begrenzt `empty` auf das
   `R`-fache der **größten Figurenklasse**. Überschüssige `empty`-Crops werden (seeded)
   zufällig verworfen — aber **vor** dem Split, konsistent.
2. **Klassen-Gewichte fürs Training:** berechne `class_weights` (invers zur Häufigkeit)
   und schreibe sie in die Split-Ausgabe, damit Stufe 5 sie im Loss nutzen kann.

> Hinweis: seltene Klassen (z. B. zwei Damen) löst man besser über gezieltes Aufnehmen in
> Stufe 2 (`collect live --start-fen`) als über reines Oversampling.

## Split — sessionbasiert (kritisch gegen Data Leakage)

Frames derselben Session/Stellung sind nahezu identisch. Ein **zufälliger** Crop-Split
würde fast gleiche Bilder in Train und Val verteilen -> künstlich hohe Scores.

Regeln:
- Split erfolgt **auf Session-Ebene**: ganze Sessions kommen vollständig nach
  train **oder** val **oder** test. Niemals Crops einer Session aufteilen.
- Ziel-Fraktionen `val-frac`/`test-frac` beziehen sich auf den Crop-Anteil; weise Sessions
  (seeded) so zu, dass die Anteile möglichst getroffen werden (greedy nach Session-Größe).
- Möglichst alle Klassen in jedem Split vertreten; wenn eine Klasse nur in einer einzigen
  Session existiert -> WARN (dann ist saubere Evaluierung dieser Klasse unmöglich).

### Split-Ausgabe
```
data/manifests/split.json
```
```json
{
  "seed": 42,
  "val_frac": 0.15, "test_frac": 0.15, "max_empty_ratio": 1.5,
  "classes": ["empty","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"],
  "class_weights": {"empty": 0.12, "wP": 1.0, "...": 0.0},
  "splits": {
    "train": ["20260625-201500", "..."],     // Session-IDs
    "val":   ["..."],
    "test":  ["..."]
  },
  "counts": {"train": 12345, "val": 1800, "test": 1750}
}
```
Stufe 5 liest **nur** diese Datei + das Manifest und filtert Crops nach Session-Zugehörigkeit.

## Augmentation-Policy (Definition hier, Anwendung in Stufe 5)

Die Kamera steht **fix** — daraus folgt, was erlaubt ist und was nicht:

- **Erlaubt (im Training):** Helligkeit/Kontrast/Gamma (wichtigster Hebel — reale
  Beleuchtungsvarianz), leichter Gaußscher Blur/Schärfe, leichtes
  Translations-/Skalierungs-Jitter (±wenige Prozent, fängt kleine Homographie-Drift ab),
  dezentes Farb-Jitter.
- **Verboten:** horizontales/vertikales Spiegeln und 90°/180°-Rotation. Das würde
  Feldfarbe und Geometrie verfälschen (eine fixe Kamera sieht nie ein gespiegeltes Brett)
  und seltene Figuren in unmögliche Kontexte setzen.
- Val/Test: **keine** Augmentation außer dem deterministischen Resize/Normalize.

Policy als Konfig ablegen (z. B. `data/manifests/augment.yaml` oder in `config.py`),
nicht im Trainingscode hartkodieren.

## `dataset verify`

Konsistenz-Checks: jede Manifest-Zeile zeigt auf eine existierende Datei; jede Datei ist
ladbar und hat die erwartete `out_size`; alle Labels sind in der Klassenliste; keine
Session ist gleichzeitig in zwei Splits.

## Akzeptanzkriterien (Definition of Done)

- `stats` gibt eine vollständige 13-Klassen-Verteilung + Hell/Dunkel-Abdeckung aus und
  warnt bei Lücken.
- `split` erzeugt `split.json`, in dem **keine** Session-ID in mehr als einem Split steht
  (durch Test abgesichert), und respektiert `max_empty_ratio`.
- `class_weights` summieren sich plausibel und sind für die größte Klasse am kleinsten.
- `dataset verify` schlägt fehl, wenn eine Datei fehlt oder eine Session in zwei Splits
  liegt.
