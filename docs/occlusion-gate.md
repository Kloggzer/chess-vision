# Die Verdeckungsschwelle folgt aus der Modellgüte

`pOccludedThr` (früher `P_OCCLUDED_THR`) stand auf 0,5 und war eine Konstante der Engine. Beides
ist falsch: die Schwelle gehört zum Modell, und 0,5 war für jedes ausgelieferte Modell zu lasch.

## Warum es ein Gate braucht

Verdeckte Felder werden nicht verschwiegen, sie werden erfunden. Gegen die SAM-Matten (470 000
Feld-Reads, `comp13-occ-bn-lr1e2-bs512`): bei 0,00–0,05 Verdeckung 66,5 % der Figuren richtig, bei
über 0,60 noch **2,4 %** — bei mittlerer Konfidenz 0,765. Ohne Gate zählt das als Evidenz (User,
2026-08-24: *„sonst ist ja jede confidente Entscheidung wenn die Hand im Bild ist einfach falsch"*).

## Die Regel

Ein Read lohnt, wenn `p(richtig) ≥ λ/(1+λ)`, λ = Preis einer Erfindung gegen den Nutzen eines
Treffers. **λ = 3** (Nutzer, 2026-09-14: „das wichtigste ist keine phantome zu haben"): ein Read muss
75 % halten. λ ist eine ENTSCHEIDUNG, keine Messung; gegen λ = 2 kostet es rund einen Prozentpunkt
der Reads.

- Entschieden wird an der **Wilson-Untergrenze**, nicht am Punktwert; dünne Bänder zusammenfassen.
- τ ist die **obere Kante des letzten angenommenen Bandes** im zusammenhängenden Lauf ab 0 — ein
  gutes Band hinter einem durchgefallenen rettet nichts.
- Nur auf Aufnahmen messen, auf denen das Modell nicht trainiert hat. Die Zirkularitätssperre liest
  den eingefrorenen `config.json["split"]` vor dem Datensatz-Verzeichnis und verweigert, wenn
  keines lesbar ist (sonst galt jede Aufnahme als herausgehalten).

Die Schwelle reist als `coverage_gate` in der `config.json` des Modells; `ModelSpec` liest sie,
`TrackerService` legt sie auf `TrackerConfig.pOccludedThr`. Fehlt der Schlüssel, gilt der
Alt-Default 0,5 mit Warnung. `build_model_card` schreibt das Feld nie, erst
`stage_model_asset.py --gate` nach der Messung — damit kein Default als gemessen durchgeht.

## Was ausgeliefert wird (gemessen 2026-09-14)

Die APK bündelt sieben `p4*`-Modelle. Gemessen auf den **12 Aufnahmen, die alle sieben
herausgehalten haben**, 104 337 Figuren-Reads gegen die SAM-Matte (Punktwerte je Band; entschieden
hat die Untergrenze):

| Modell | τ (λ=3) | 0,00–0,02 | 0,15–0,25 | 0,25–0,35 | 0,50–0,70 |
|---|---|---|---|---|---|
| `p4a-128` | **0,35** | 96,9 % | 84,6 % | 80,2 % | 42,2 % |
| `p4afull-128` | **0,35** | 95,5 % | 84,9 % | 77,7 % | 47,8 % |
| `p4a-80-clahe` (Default) | **0,25** | 94,1 % | 79,2 % | 72,2 % | 29,5 % |
| `p4a-80` | **0,15** | 93,5 % | 68,2 % | 55,9 % | 18,3 % |
| `p4-128` | **0,05** | 97,5 % | 61,4 % | 44,5 % | 22,8 % |
| `p4-80` | **0,05** | 94,2 % | 57,2 % | 46,7 % | 21,7 % |
| `p4full-128` | **0,05** | 97,8 % | 64,8 % | 53,7 % | 24,9 % |

Es bleiben je Modell 84–85 % der Reads. Unter λ = 2 säßen drei lockerer: `p4a-80-clahe` 0,35,
`p4-128` 0,10, `p4full-128` 0,15. Faktor 7 zwischen strengstem und lockerstem Gate — eine
gemeinsame Konstante kann für beide Enden nicht stimmen.

**Am Regressionssatz kein Unterschied:** 0,5 gegen 0,25 ergibt Aufnahme für Aufnahme dasselbe,
obwohl das Gate 17 % mehr Zellen maskiert. Der Satz enthält den Fall nicht, gegen den es schützt
(`docs/regression-reference.md`).

## Ein neues Modell stempeln

    uv run chesslab realgames model-read <session> --model <asset-dir> --out model-reads.gate-<m>.jsonl
    uv run python scripts/occlusion_gate.py model-reads.gate-<m>.jsonl <herausgehaltene Sessions>
    uv run python scripts/stage_model_asset.py --stamp <asset-dir> --gate <tau>

`--out` ist Pflicht: `model-reads.jsonl` ist tragend (Labeling-Lane, `audit_flags`, Chain-Steps,
Provenance). `stage_model_asset.py` ergänzt `coverage_output` und `coverage_gate` — `chesslab
export` schreibt beides nicht, und ein 14-spaltiger Graph ohne `coverage_output` würde als 14
Klassen gesoftmaxt. `BUNDLED_MODELS` ist HANDGEPFLEGT: ein Modell, das nur in `assets/cnn_model/`
liegt, erscheint nicht im Picker, und `bundledModelOrDefault` setzt einen unbekannten Namen still
auf den Default zurück.

## Warum τ im Mittelfeld kaum etwas ändert

Verdeckung ist zweigipflig (`real13-straight-80-v3`, 424 519 Zellen): 88,7 % exakt 0, 5,3 % über
0,75, nur **2,3 %** zwischen 0,02 und 0,25. Eine Hand ist größer als ein Feld; teilweise verdeckt
sind nur die Silhouettenränder. Die Entscheidung ist praktisch binär — den stark verdeckten Block
annehmen oder nicht —, und der Schaden kam allein vom Alt-Default 0,5. Aus demselben Grund lohnt es
nicht, die Trainingsmaske zu verschieben (`--visible-max 0.2` fügt 0,37 % Zellen hinzu).

- **Die vorhergesagte Coverage ist gut kalibriert:** echte Verdeckung < 5 % → Median 0,001,
  > 45 % → 0,838.
- **Der Kopf über-meldet nicht:** eine echte Hand deckt im Median 3 Felder, im p90 23, maximal 41.
  Eine Ausdehnungsgrenze würde echte Hände wegwerfen.

## Kopf gegen Hand-Schüler (2026-08-26)

16 000 Zellen aus `rg-2026-08-16-20-41-33`, beiden ungesehen, gegen SAMs Matte
(`scripts/coverage_arms.py`), bei τ = 0,15:

| | Precision | Recall | F1 |
|---|---|---|---|
| CNN-Kopf `c8d1-seed43` | **0,958** | 0,959 | **0,958** |
| Hand-Schüler `mnv4-640` | 0,520 | **0,988** | 0,682 |

Der Schüler ist ein **Recall-Sieb** für den Ingest (eine verpasste Hand verdirbt 64 Labels); als
Präzisionsinstrument auf dem Gerät ist er die schlechtere Wahl. Den Kopf behalten, den Schüler im
Ingest lassen. Ungemessen: der modellfreie `gridOccluded`-Arm gegen beide.
